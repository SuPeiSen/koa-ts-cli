#!/usr/bin/env node
import { Command } from "commander";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, existsSync } from "fs";
import { CreateCommand } from "../src/commands/create_command.js";
import { AddCommand } from "../src/commands/add_command.js";
import { DevCommand } from "../src/commands/dev_command.js";
import { BuildCommand } from "../src/commands/build_command.js";
import { DocCommand } from "../src/commands/doc_command.js";
import { Logger } from "../src/core/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to find package.json and template dir
let packageJsonPath = join(__dirname, "../package.json");
if (!existsSync(packageJsonPath)) {
    packageJsonPath = join(__dirname, "../../package.json");
}
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

// Determine template path (handle dist vs src)
// If running from dist/bin, template is likely in ../template (if we copy it) or ../../src/template (if dev)
// Robust check:
let templatePath = join(__dirname, "../template");
if (!existsSync(templatePath)) {
    // Try src location for dev mode
    templatePath = join(__dirname, "../src/template");
}

const program = new Command();

program
    .version(packageJson.version)
    .description("A custom CLI tool for project scaffolding");

program
    .command("create <project-name>")
    .description("Create new project")
    .option("-n, --npm_type <npm_type>", "Specify npm type")
    .option("-r, --registry <registry>", "Specify registry type")
    .option("-t, --template <template>", "Specify project template")
    .option("-d, --docker", "Add docker file")
    .action((name, options) => {
        CreateCommand.execute(name, options, templatePath);
    });

program
    .command("dev")
    .description("Start development server")
    .action(() => {
        DevCommand.execute();
    });

program
    .command("add <controller-name>") // Spec says controller-path in help but logic uses argument.
    .description("Add controller & validate")
    .option("-c, --controller <controller_path>", "Specify controller path (relative to src)")
    .option("-v, --validate <validate_path>", "Specify validate path (relative to src)")
    .action((name, options) => {
        AddCommand.execute(name, options, templatePath);
    });

program
    .command("doc")
    .description("Generate api documentation")
    .action(() => {
        DocCommand.execute();
    });

program
    .command("build")
    .description("Build project")
    .option("-c, --copy_env", "Copy .env to build")
    .action((options) => {
        BuildCommand.execute(options);
    });

program.parse(process.argv);

// Global Error Handler for unhandled promises
process.on('unhandledRejection', (err) => {
    Logger.error(err as Error);
    process.exit(1);
});
