export interface SequenceFrame {
  id: string;
  name: string;
  bytes: number;
  lastModified: number;
  digest: string;
  url: string;
}

const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function naturalFrameOrder<T extends Pick<SequenceFrame, "name" | "lastModified">>(frames: T[]): T[] {
  return [...frames].sort((left, right) =>
    naturalCollator.compare(left.name, right.name) || left.lastModified - right.lastModified,
  );
}

export function moveFrame<T>(frames: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= frames.length || to >= frames.length) return frames;
  const next = [...frames];
  const [frame] = next.splice(from, 1);
  next.splice(to, 0, frame);
  return next;
}

export function sequenceDuration(frameCount: number, fps: number): number {
  return frameCount > 0 && fps > 0 ? frameCount / fps : 0;
}
