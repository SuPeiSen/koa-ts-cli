import { spawn, ChildProcess } from "child_process";
import chokidar from "chokidar";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path, { join } from "path";
import dotenv from "dotenv";
import { Logger } from "../core/logger.js";

const projectPath = process.cwd();
const SRC_DIR = path.join(projectPath, "src");
const ENV_DIR = path.join(projectPath, "env");
const TS_CONFIG_PATH = path.join(projectPath, "tsconfig.json");
const MAIN_FILE = path.join(SRC_DIR, "index.ts");
const ENV_DTS_FILE = path.join(SRC_DIR, "env.d.ts");

interface ChokidarConfig {
    [key: string]: any;
    watchPath?: string[];
}

export class DevService {
    private static childProcess: ChildProcess | null = null;

    /**
     * 启动开发服务器。
     * 1. 加载 chokidar 配置。
     * 2. 设置源码和环境变量文件的监听。
     * 3. 生成环境变量类型定义。
     * 4. 启动应用进程。
     */
    static async start() {
        // 1. Load Config
        const chokidarConfig = await this.loadChokidarConfig();

        // 2. Setup Watch Paths
        const watchPaths = chokidarConfig.watchPath || [];
        watchPaths.push(...[SRC_DIR, ENV_DIR]);

        watchPaths.forEach((p) => {
            Logger.info(`Watching: ${p}`);
        });

        // 3. Initialize Watcher
        const watcher = chokidar.watch(watchPaths, {
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: true,
            ...chokidarConfig,
        });

        watcher.on("all", (eventName, filePath) => {
            Logger.debug(`${eventName} => ${filePath}`);

            // Regenerate env types if env file changes
            if (filePath.includes("env") && filePath.endsWith(".env")) {
                this.generateEnvDts(ENV_DTS_FILE);
            }

            // Restart Process
            if (this.childProcess) {
                Logger.warn("Change detected, restarting...");
                this.childProcess.kill();
            }
            this.startProcess();
        });

        // 4. Initial Run
        this.generateEnvDts(ENV_DTS_FILE);
        this.startProcess();
    }

    /**
     * 使用 ts-node/tsx 启动子进程。
     * 处理标准输入输出的继承和环境变量。
     */
    private static startProcess() {
        this.childProcess = spawn(
            "npx",
            ["ts-node", "--files", "-r", "tsconfig-paths/register", MAIN_FILE, "-P", TS_CONFIG_PATH],
            {
                stdio: "inherit",
                env: {
                    ...process.env,
                    NODE_ENV: "development",
                    FORCE_COLOR: "3",
                },
            }
        );

        this.childProcess.on("error", (error) => {
            Logger.error(`Failed to start child process: ${error.message}`);
        });
    }

    /**
     * 从 `chokidar.config.js` 加载自定义 Chokidar 配置。
     * @returns 配置对象，如果未找到则返回空对象。
     */
    private static async loadChokidarConfig(): Promise<ChokidarConfig> {
        const configPath = path.join(projectPath, "chokidar.config.js");
        if (existsSync(configPath)) {
            try {
                const configModule = await import(configPath);
                const config = configModule.default?.default || configModule.default || {};
                if (Object.keys(config).length > 0) {
                    Logger.success(`Loaded Chokidar config: ${configPath}`);
                }
                return config;
            } catch (err: any) {
                Logger.error(`Failed to load Chokidar config: ${err.message}`);
            }
        }
        return {};
    }

    /**
     * 扫描 .env 文件并生成 `env.d.ts` 声明文件。
     * 确保 process.env 的类型安全。
     * @param outputPath - d.ts 文件的写入路径。
     */
    private static generateEnvDts(outputPath: string) {
        const envKeys = new Set<string>();

        if (!existsSync(ENV_DIR)) {
            Logger.warn("env directory not found, skipping type generation");
            return;
        }

        const files = readdirSync(ENV_DIR);
        files.forEach((fileName) => {
            const content = readFileSync(join(ENV_DIR, fileName), "utf8");
            const parsed = dotenv.parse(content);
            Object.keys(parsed).forEach((key) => envKeys.add(key));
        });

        if (envKeys.size === 0) {
            Logger.warn("No env keys found");
            return;
        }

        const typeLines = Array.from(envKeys)
            .sort()
            .map((key) => `    ${key}: string;`)
            .join("\n");

        const dtsContent = `
// 自动生成的 env 类型声明文件
declare namespace NodeJS {
  interface ProcessEnv {
${typeLines}
  }
}
`;

        writeFileSync(outputPath, dtsContent, "utf8");
        Logger.success(`Generated ${outputPath} (${envKeys.size} keys)`);
    }
}
