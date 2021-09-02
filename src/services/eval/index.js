import { safeEval } from './parser.js';
import { getCommandArgs } from '../../utils/command.js';

/**
 *
 * @param {import('telegraf').Context} context
 * @returns {Promise<void>}
 */
async function evalCommand(context) {
  const source = getCommandArgs('eval', context);

  const output = safeEval(source);

  await context.replyWithMarkdown(`
Code:
\`\`\`
${source}
\`\`\`

Output:
\`\`\`
${output}
\`\`\`
  `);
}

/**
 * Evaluate javascript expression.
 * @param {import('telegraf').Telegraf} bot
 * @returns {{command: String, description: String}[]}
 */
export function register(bot) {
  bot.command('eval', evalCommand);

  return [
    {
      command: 'eval',
      description: 'Evaluate javascript expression.',
    },
  ];
}
