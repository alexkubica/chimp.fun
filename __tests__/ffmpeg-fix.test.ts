import { ffmpegPath } from "ffmpeg-ffprobe-static";

describe("FFmpeg Static Binary Import", () => {
  test("should import ffmpegPath correctly", () => {
    expect(ffmpegPath).toBeDefined();
    expect(typeof ffmpegPath).toBe("string");
    expect(ffmpegPath).toContain("ffmpeg");
  });

  test("should not be an object", () => {
    // This test verifies the original bug is fixed
    // The original error was: "[object Object]" command not found
    expect(typeof ffmpegPath).not.toBe("object");
  });

  test("should be a valid path string", () => {
    expect(ffmpegPath).toMatch(/ffmpeg$/);
  });
});
