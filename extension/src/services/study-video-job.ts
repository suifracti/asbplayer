export interface SubtitleProgress {
    done: number;
    total: number;
}

/** One user operation covers the whole track. Pause is cooperative between bounded requests. */
export async function runSubtitleJob<T extends SubtitleProgress>(
    initial: T,
    next: () => Promise<T>,
    paused: () => boolean,
    update: (s: T) => void
): Promise<T> {
    let current = initial;
    for (let requests = 0; current.done < current.total && !paused(); requests++) {
        if (requests >= 60) throw new Error('本次已达60请求上限；已保存进度，明确点击继续可追加。');
        const result = await next();
        if (result.total !== current.total || result.done <= current.done || result.done > result.total) {
            throw new Error('字幕进度未对齐，已停止；没有把未译行当作完成。');
        }
        current = result;
        update(current);
    }
    return current;
}
