import { getTheDevRead } from "./request.js";
import { shuffleArray } from "#utils/random.js";
import { renderTemplate } from "#utils/template.js";
import { getCommandArgs } from "#utils/command.js";
import { logger } from "#utils/logger/index.js";

const WHITELIST = ["javascript", "php", "go", "c", "typescript", "python"];

/**
 * Send help to user when needed.
 * @param {import('telegraf').Context} context
 * @param {import('@teknologi-umum/nedb-promises')} cache
 * @returns {Promise<void>}
 */
async function devRead(context, cache) {
  const query = getCommandArgs("devread", context);

  if (query === "") {
    await context.telegram.sendMessage(
      context.message.chat.id,
      "Cara pakainya ketik: /devread &lt;apa yang mau kamu cari&gt;\n\nContoh: <code>/devread javascript</code>",
      { parse_mode: "HTML" }
    );
    return;
  }

  if (WHITELIST.includes(query.toLowerCase())) {
    // Check if the data exists in redis
    const { value: queryData, ttl } = await cache.findOne({ key: `devread:${encodeURI(query.toLowerCase())}` }) || {
      value: undefined,
      ttl: 0
    };

    if (queryData && ttl < Date.now()) {
      const items = shuffleArray(JSON.parse(queryData), 3);
      const read = items
        .map(({ title, body, url }) =>
          renderTemplate("devread/devread.template.hbs", { title, body, url })
        )
        .join("\n");
      await context.telegram.sendMessage(context.message.chat.id, read, {
        parse_mode: "HTML"
      });
      return;
    }
  }

  // It's not WHITELISTed OR it's not on redis, then we fetch the data
  const data = await getTheDevRead(query.toLowerCase());

  if (!data.length) {
    await context.telegram.sendMessage(
      context.message.chat.id,
      "Yha ga ketemu, cari keyword lain yuk"
    );
    return;
  }

  const items = shuffleArray(data, 3);
  const read = items
    .map((x) =>
      renderTemplate("devread/devread.template.hbs", {
        title: x?.title ?? "",
        body: x?.body ?? "",
        url: x?.url ?? ""
      })
    )
    .join("\n");

  await context.telegram.sendMessage(context.message.chat.id, read, {
    parse_mode: "HTML"
  });

  // Cache the result in redis for 6 hours
  // First we filter it first, we don't want too much data stored in redis
  const filteredData = data.map(({ title, body, url }) => ({
    title: title
      ? title.length > 50
        ? title.substr(0, 49) + "..."
        : title
      : title,
    body: body
      ? body.length > 300
        ? body.substr(0, 299) + "..."
        : body
      : body,
    url
  }));

  await cache.update({
    key: `devread:${encodeURI(query.toLowerCase())}`
  },
  {
    ttl: Date.now() + 1000 * 60 * 60 * 6,
    value: JSON.stringify(filteredData)
  },
  {upsert: true});
  await logger.fromContext(context, "devread", { sendText: read || "" });
}

/**
 * Send help to user when needed.
 * @param {import('telegraf').Telegraf} bot
 * @returns {{command: String, description: String}[]}
 */
export function register(bot, cache) {
  bot.command("devread", (context) => devRead(context, cache));

  return [
    {
      command: "devread",
      description: "Articles for developers"
    }
  ];
}
