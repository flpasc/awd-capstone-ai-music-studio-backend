// Format as string: [mm:ss.SSS]Lyric line\n
export function formatTimestamp(sec: number): string {
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return `[${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${ms.toString().padStart(3, '0')}]`;
}

export function stripCodeBlocks(text: string): string {
  return text
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .trim();
}

export function cleanLyricsResponse(lyricsContent: string): string {
  let cleanedLyrics = lyricsContent.trim();
  cleanedLyrics = stripCodeBlocks(cleanedLyrics);
  if (cleanedLyrics.startsWith('{') && cleanedLyrics.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleanedLyrics) as {
        lyrics?: Array<{ text?: string }>;
      };
      if (
        parsed &&
        Array.isArray(parsed.lyrics) &&
        parsed.lyrics.every((item) => typeof item.text === 'string')
      ) {
        cleanedLyrics = parsed.lyrics
          .map((item) => item.text as string)
          .join('\n');
      }
    } catch (error) {
      console.error(error);
      // Optionally log error
    }
  }
  cleanedLyrics = cleanedLyrics.replace(/^['"`]+|['"`]+$/g, '').trim();
  return cleanedLyrics;
}
