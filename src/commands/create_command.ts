import inquirer from "inquirer";
import path from "path";
import { Logger } from "../core/logger.js";
import { TemplateService } from "../services/template_service.js";
import { ProjectService } from "../services/project_service.js";
import { REGISTRY_URLS } from "../constants/index.js";

// Re-export this if needed or keep it internal
export interface CreateOptions {
  npm_type?: "npm" | "pnpm" | "yarn";
  registry?: string;
  template?: string; // Not heavily used in original logic but passed
  docker?: boolean;
  x_get?: boolean;
  sql?: "none" | "prisma" | "typeorm";
}

export class CreateCommand {
  /**
   * 执行创建项目命令。
   * 1. 收集用户选项（交互式询问）。
   * 2. 调用 TemplateService 下载模板。
   * 3. 调用 ProjectService 进行后续配置。
   */
  static async execute(
    projectName: string,
    options: CreateOptions,
    templatePath: string,
  ) {
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "npm_type",
        message: "Choose npm type:",
        choices: ["npm", "pnpm", "yarn"],
        default: "npm",
        when: !options.npm_type,
      },
      {
        type: "list",
        name: "registry",
        message: "Choose registry type:",
        default: REGISTRY_URLS.default,
        choices: [
          {
            name: `default (${REGISTRY_URLS.default})`,
            value: REGISTRY_URLS.default,
          },
          {
            name: `taobao (${REGISTRY_URLS.taobao})`,
            value: REGISTRY_URLS.taobao,
          },
          {
            name: `tsinghua (${REGISTRY_URLS.tsinghua})`,
            value: REGISTRY_URLS.tsinghua,
          },
        ],
        when: !options.registry,
      },
      {
        type: "confirm",
        name: "x_get",
        message: "use Xget, https://github.com/xixu-me/Xget",
        default: false,
        when: options.x_get === undefined,
      },
      {
        type: "confirm",
        name: "docker",
        message: "add docker initial configuration",
        default: false,
        when: options.docker === undefined,
      },
      {
        type: "list",
        name: "sql",
        message: "database initialization",
        default: "none",
        choices: ["none", "prisma", "typeorm"],
        when: !options.sql,
      },
    ]);

    const finalOptions = { ...options, ...answers };

    if (finalOptions.npm_type === "pnpm") {
      Logger.info("Node.js 20+ is recommended for pnpm.");
    }

    const projectPath = path.join(process.cwd(), projectName);

    try {
      // 1. Download Template
      await TemplateService.downloadTemplate(projectName, finalOptions);

      // 2. Setup Project (DB, Docker, etc)
      ProjectService.setupProject(projectPath, {
        projectName,
        npm_type: finalOptions.npm_type!,
        sql: finalOptions.sql!,
        docker: finalOptions.docker!,
        templatePath,
      });

      Logger.success(`\nProject created! Run:\n\n cd ${projectName}\n`);
    } catch (error) {
      Logger.error(error as Error);
      process.exit(1);
    }
  }
}
