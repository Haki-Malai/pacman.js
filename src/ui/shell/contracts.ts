export interface PacmanExperience {
    start(): Promise<void>;
    pause(): void;
    resume(): void;
    destroy(): void;
}

export interface PacmanRuntime {
    start(): Promise<void>;
    pause(): void;
    resume(): void;
    destroy(): void;
}

export interface PacmanRuntimeFactory {
    (options: { mountId: string }): PacmanRuntime;
}
