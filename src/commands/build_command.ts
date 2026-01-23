import { BuildService } from "../services/build_service.js";

interface BuildOptions {
    copy_env?: boolean;
    doc?: boolean;
}

export class BuildCommand {
    /**
     * 执行项目构建命令。
     * @param options - 构建选项，例如是否复制 env 文件。
     */
    static async execute(options: BuildOptions) {
        await BuildService.build(!!options.copy_env, !!options.doc);
    }
}
