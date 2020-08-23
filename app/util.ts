import { Collection } from "discord.js";

import { resolve } from "path";

import { readdirSync } from "fs";

import { ICommand } from "./typings/Command";
import Commands from "./typings/Commands";

/**
 *Goes through checks to make sure a command is valid, and adds it to a collection if it is
 *
 * @param {Collection} collection the collection the command should be added to
 * @param {Object} command the command itself
 * @returns {void}
 */
const addCommand = (collection: Collection<string, any>, command: ICommand): void => {
  if (command.config.disabled) {
    return;
  }
  if (!command.config.name) {
    throw new Error("Missing command name");
  }
  collection.set(command.config.name, command);
};


const loadCommands = async (folder = "./commands/"): Promise<Collection<string, ICommand>> => {
  const CommandCollection = new Collection<string, ICommand>();

  //? Goes through a folder and finds all .js and .ts files
  const files = readdirSync(folder).filter(
    (file) => file.endsWith(".js") || file.endsWith(".ts")
  );

  //? For every file
  for (const file of files) {
    //? Require it, making sure to add in the folder it is in
    const commands = await require(resolve(folder, file));

    //? Check if a command file contains multiple commands, indicated by class Commands
    //? and add each of them to the collection if it is. Otherwise just add a single one
    if (commands instanceof Commands) {
      commands.commands.forEach(command => {
        addCommand(CommandCollection, command);
      });
    } else {
      addCommand(CommandCollection, commands);
    }
  }

  //? Then return the new collection of commands
  return CommandCollection;
};

export { loadCommands };
