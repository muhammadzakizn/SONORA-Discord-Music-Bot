namespace LyricifyApi.Models;

/// <summary>
/// Response model for lyrics API
/// </summary>
public class LyricsResponse
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public string? Source { get; set; }
    public bool HasSyllableTiming { get; set; }
    public LyricsData? Lyrics { get; set; }
}

public class LyricsData
{
    public string? RawLyrics { get; set; }
    public string? Translation { get; set; }
    public List<LyricLine>? Lines { get; set; }
}

public class LyricLine
{
    public int StartTime { get; set; }
    public int Duration { get; set; }
    public string? Text { get; set; }
    public List<Syllable>? Syllables { get; set; }
}

public class Syllable
{
    public string? Text { get; set; }
    public int Start { get; set; }
    public int Duration { get; set; }
}

/// <summary>
/// Response model for search API
/// </summary>
public class SearchResponse
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public List<SearchResult>? Results { get; set; }
}

public class SearchResult
{
    public string? Id { get; set; }
    public string? Title { get; set; }
    public string? Artist { get; set; }
    public string? Album { get; set; }
    public int? DurationMs { get; set; }
    public string? Source { get; set; }
}
