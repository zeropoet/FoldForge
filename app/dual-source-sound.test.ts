import { describe, expect, it } from "vitest";
import archive from "../public/ethereum-archive/index.json";
import soundArchive from "../public/record-sound-archive.json";

describe("dual-source Ethereum sound", () => {
  it("keeps two exclusive holdings sources and publishes one centered shared state", () => {
    expect(archive.owners.map((owner) => owner.name)).toEqual(["zeropoet.eth", "rootlogos.eth"]);
    expect(archive.tokens.every((token) => token.owners.length === 1)).toBe(true);
    expect(archive.owners.reduce((total, owner) => total + owner.work_count, 0)).toBe(archive.work_count);

    const shared = soundArchive.entries.find((entry) => entry.id === "foldforge-dual-source-field");
    if (!shared?.sound.frequenciesHz) throw new Error("Dual Source Field is missing its relational frequencies");
    expect(shared?.sources).toHaveLength(2);
    expect(shared?.sound.renderer.stereo).toBe("center");
    expect(shared?.sound.renderer.composite?.mode).toBe("simultaneous-sum");
    expect(shared.sound.frequenciesHz).toHaveLength(4);
    expect(shared.sound.frequenciesHz[2]).not.toBe(shared.sound.frequenciesHz[0]);
    expect(shared.sound.frequenciesHz[2]).not.toBe(shared.sound.frequenciesHz[1]);
  });
});
