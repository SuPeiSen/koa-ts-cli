import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { Logger } from "../core/logger.js";
import { DocService } from "./doc_service.js";

export class BuildService {
  /**
   * 执行项目构建流程。
   * 1. 清理构建目录。
   * 2. 编译 TypeScript 代码。
   * 3. 解析路径别名 (tsc-alias)。
   * 4. 复制环境变量文件。
   * @param copyEnv - 是否将 .env 文件复制到构建目录。
   * @param buildDoc - 是否构建文档。
   */
  static async build(copyEnv: boolean, buildDoc: boolean = false) {
    const projectPath = process.cwd();
    const buildDir = path.join(projectPath, "build");
    const tsConfig = path.join(projectPath, "tsconfig.json");

    Logger.info("Starting build...");

    // 1. Clean
    Logger.info("Cleaning build directory...");
    await this.spawnPromise("rm", ["-rf", buildDir]);

    // 2. TSC
    Logger.info("Compiling TypeScript...");
    try {
      await this.spawnPromise("npm", ["exec", "--", "tsc", "-p", tsConfig]);
    } catch (e) {
      Logger.error(`Compilation failed: ${e}`);
      return;
    }

    // 3. TSC Alias
    Logger.info("Resolving aliases...");
    try {
      await this.spawnPromise("npm", [
        "exec",
        "--",
        "tsc-alias",
        "-p",
        tsConfig,
      ]);
    } catch (e) {
      Logger.error(`Alias resolution failed: ${e}`);
      return;
    }

    // 4. Copy Env
    if (copyEnv) {
      Logger.info("Copying .env files...");
      await this.spawnPromise("cp", [
        "-r",
        path.join(projectPath, "env"),
        buildDir,
      ]);
    } else {
      await this.spawnPromise("mkdir", ["-p", path.join(buildDir, "env")]);
    }

    // 5. Compile Doc (if enabled)
    if (buildDoc) {
      Logger.info("Compiling documentation...");
      const tempTsConfigPath = path.join(projectPath, "tsconfig.doc.json");
      const tempTsConfig = {
        extends: "./tsconfig.json",
        compilerOptions: {
          rootDir: ".",
          outDir: "./build",
          noEmit: false,
        },
        include: ["doc/**/*"],
      };

      try {
        fs.writeFileSync(
          tempTsConfigPath,
          JSON.stringify(tempTsConfig, null, 2),
        );

        await this.spawnPromise("npm", [
          "exec",
          "--",
          "tsc",
          "-p",
          tempTsConfigPath,
        ]);
      } catch (e) {
        Logger.error(`Documentation compilation failed: ${e}`);
      } finally {
        if (fs.existsSync(tempTsConfigPath)) {
          fs.unlinkSync(tempTsConfigPath);
        }
      }
    }

    Logger.success("Build completed successfully! ✅");
  }

  /**
   * 辅助方法：生成子进程并返回 Promise。
   * 退出码为 0 时 resolve，否则 reject。
   * @param command - 要运行的命令。
   * @param args - 命令参数。
   */
  private static spawnPromise(command: string, args: string[]) {
    return new Promise<void>((resolve, reject) => {
      const p = spawn(command, args, { stdio: "inherit" });
      p.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Command ${command} exited with code ${code}`));
      });
      p.on("error", (err) => reject(err));
    });
  }
}
