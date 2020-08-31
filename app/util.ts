import { Collection, Client } from "discord.js";

import { resolve } from "path";

import { readdirSync } from "fs";

import Command, { ICommand } from "./typings/Command";
import CommandGroup from "./typings/CommandGroup";

import logger from "./handlers/logging";

/**
 *Goes through checks to make sure a command is valid, and adds it to a collection if it is
 *
 * @param {Collection} collection the collection the command should be added to
 * @param {Object} command the command itself
 * @returns {void}
 */
const addCommand = (
  collection: Collection<string, any>,
  command: ICommand
): void => {
  if (command.config.disabled) {
    return;
  }
  if (!command.config.name) {
    logger.warn("Command missing name");
    return;
  }
  collection.set(command.config.name, command);
};

/**
 *Loads commands from `folder` and returns a new collection
 *
 * @param {string} [folder="./commands/"] The folder to be searched
 * @returns {Promise<Collection<string, ICommand>>} A promise for a collection of all the commands found
 */
const loadCommands = async (
  folder = "./commands/"
): Promise<{
  commands: Client["commands"];
  commandGroups: Client["commandGroups"];
}> => {
  const CommandCollection = new Collection<string, ICommand>();
  const CommandGroups: Client["commandGroups"] = [];
  const ungroupedCommands = new CommandGroup(
    {
      name: "Ungrouped",
      description: "Commands that are not in a particular group",
    },
    []
  );

  //? Goes through a folder and finds all .js and .ts files
  const files = readdirSync(folder).filter(
    (file) => file.endsWith(".js") || file.endsWith(".ts")
  );

  logger.debug(`Found files while loading commands: ${files}`);

  //? For every file
  for (const file of files) {
    //? Require it, making sure to add in the folder it is in
    const commands: CommandGroup | Command | void = await require(resolve(
      folder,
      file
    ));

    logger.debug(`Required file ${file}`);
    //? Check if a command file contains multiple commands, indicated by class Commands
    //? and add each of them to the collection if it is. Otherwise just add a single one
    if (commands instanceof CommandGroup) {
      CommandGroups.push(commands);

      commands.commands.forEach((command) => {
        addCommand(CommandCollection, command);
      });
    } else if (commands instanceof Command) {
      addCommand(CommandCollection, commands);

      ungroupedCommands.commands.push(commands);
    } else {
      continue;
    }
  }

  CommandGroups.push(ungroupedCommands);

  //? Then return the new collection of commands
  logger.info(
    `Finished loading commands: ${CommandCollection.map(
      (command) => command.config.name
    )}`
  );
  return { commands: CommandCollection, commandGroups: CommandGroups };
};
};

/**
 *Sets all the cooldowns for a command
 *
 * @param {Client} client The client object
 */
const setCooldowns = (client: Client): void => {
  //? Make the cooldown collection that will be added to the client later
  const cooldowns = new Collection<string, Collection<string, number>>();

  //? For every command, add it to the collection. Using it's name as the key
  client.commands.forEach((command) => {
    cooldowns.set(command.config.name, new Collection());
  });
  logger.debug("Added cooldowns for commands");

  //? Add the cooldown collection to the client
  client.cooldowns = cooldowns;
};

/**
 *Gets a command from a Collection
 *
 * @param {Collection<string, Command>} commandCollection The collection with the commands to be searched for
 * @param {any} commandOrAlias A command name or alias for a command
 * @returns {Command} A command object
 */
const getCommand = (
  commandCollection: Collection<string, Command>,
  // eslint-disable-next-line
  commandOrAlias: any
): Command =>
  //? Try to find a command, and if we can't find it by the name provided by the user, check if it was an alias.
  commandCollection.get(commandOrAlias) ||
  commandCollection.find(
    //? These are the criteria that will be tested
    (cmd) =>
      //? The command has to have the aliases property
      cmd.config.aliases &&
      //? It has to be longer than 0
      cmd.config.aliases.length !== 0 &&
      //? And it has to include the name provided
      cmd.config.aliases.includes(commandOrAlias)
  );

export { loadCommands, setCooldowns, getCommand };
