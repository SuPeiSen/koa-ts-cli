import inquirer from "inquirer";
import { join } from "path";
import { GeneratorService } from "../services/generator_service.js";
import { Logger } from "../core/logger.js";

interface AddOptions {
    controller?: string;
    validate?: string;
}

export class AddCommand {
    /**
     * 执行添加控制器和校验器命令。
     * 1. 询问是否添加校验器（如果在选项中未指定）。
     * 2. 生成控制器文件。
     * 3. 生成校验器文件（如果需要）。
     */
    static async execute(
        controllerName: string,
        options: AddOptions,
        templatePath: string
    ) {
        const cwd = process.cwd();
        const srcDir = join(cwd, "src");

        try {
            // 1. Ask about validation
            let validatePath = options.validate;

            if (!validatePath) {
                const answer = await inquirer.prompt([
                    {
                        type: "list",
                        name: "addValidate",
                        message: "Would you like to add validation?",
                        choices: ["yes", "no"],
                    },
                ]);

                if (answer.addValidate === "yes") {
                    const pathAnswer = await inquirer.prompt([
                        {
                            type: "input",
                            name: "validatePath",
                            message: "Please input the validation path (default: validate):",
                            default: "validate"
                        },
                    ]);
                    validatePath = pathAnswer.validatePath;
                }
            }

            // 2. Generate Controller
            const controllerDir = join(srcDir, options.controller || "controller");
            await GeneratorService.generateController(
                controllerName,
                controllerDir,
                templatePath
            );

            // 3. Generate Validator (if needed)
            if (validatePath) {
                const validateDir = join(srcDir, validatePath);
                await GeneratorService.generateValidator(
                    controllerName,
                    validateDir,
                    templatePath
                );
            }

        } catch (error: any) {
            Logger.error(error);
            process.exit(1);
        }
    }
}
