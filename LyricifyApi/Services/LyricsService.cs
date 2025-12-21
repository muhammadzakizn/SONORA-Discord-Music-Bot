using System.Text.RegularExpressions;
using LyricifyApi.Models;
using Lyricify.Lyrics.Searchers;
using QQMusicApi = Lyricify.Lyrics.Providers.Web.QQMusic.Api;
using NeteaseApi = Lyricify.Lyrics.Providers.Web.Netease.Api;
using KugouApi = Lyricify.Lyrics.Providers.Web.Kugou.Api;

namespace LyricifyApi.Services;

/// <summary>
/// Service for fetching lyrics from various sources
/// </summary>
public class LyricsService
{
    private readonly QQMusicApi _qqMusicApi;
    private readonly QQMusicSearcher _qqMusicSearcher;
    private readonly NeteaseSearcher _neteaseSearcher;
    private readonly KugouSearcher _kugouSearcher;

    // Regex to parse QRC format: word(start,duration)
    private static readonly Regex QrcLineRegex = new(@"^\[(\d+),(\d+)\](.*)$", RegexOptions.Compiled);
    private static readonly Regex QrcSyllableRegex = new(@"([^\(\)]+)\((\d+),(\d+)\)", RegexOptions.Compiled);

    public LyricsService()
    {
        _qqMusicApi = new QQMusicApi();
        _qqMusicSearcher = new QQMusicSearcher();
        _neteaseSearcher = new NeteaseSearcher();
        _kugouSearcher = new KugouSearcher();
    }

    /// <summary>
    /// Search for songs across multiple sources
    /// </summary>
    public async Task<SearchResponse> SearchAsync(string title, string artist, string? source = null)
    {
        var response = new SearchResponse { Success = true, Results = new List<SearchResult>() };

        try
        {
            var searchQuery = string.IsNullOrEmpty(artist) ? title : $"{title} {artist}";

            // Search QQ Music
            if (source == null || source.ToLower() == "qqmusic")
            {
                var qqResults = await _qqMusicSearcher.SearchForResults(searchQuery);
                if (qqResults != null)
                {
                    foreach (var result in qqResults.Take(5))
                    {
                        if (result is QQMusicSearchResult qqResult)
                        {
                            response.Results.Add(new SearchResult
                            {
                                Id = qqResult.Id,
                                Title = qqResult.Title,
                                Artist = string.Join(", ", qqResult.Artists),
                                Album = qqResult.Album,
                                DurationMs = qqResult.DurationMs,
                                Source = "qqmusic"
                            });
                        }
                    }
                }
            }

            // Search Netease
            if (source == null || source.ToLower() == "netease")
            {
                var neteaseResults = await _neteaseSearcher.SearchForResults(searchQuery);
                if (neteaseResults != null)
                {
                    foreach (var result in neteaseResults.Take(5))
                    {
                        if (result is NeteaseSearchResult neteaseResult)
                        {
                            response.Results.Add(new SearchResult
                            {
                                Id = neteaseResult.Id,
                                Title = neteaseResult.Title,
                                Artist = string.Join(", ", neteaseResult.Artists),
                                Album = neteaseResult.Album,
                                DurationMs = neteaseResult.DurationMs,
                                Source = "netease"
                            });
                        }
                    }
                }
            }

            // Search Kugou
            if (source == null || source.ToLower() == "kugou")
            {
                var kugouResults = await _kugouSearcher.SearchForResults(searchQuery);
                if (kugouResults != null)
                {
                    foreach (var result in kugouResults.Take(5))
                    {
                        if (result is KugouSearchResult kugouResult)
                        {
                            response.Results.Add(new SearchResult
                            {
                                Id = kugouResult.Hash, // Kugou uses Hash as ID
                                Title = kugouResult.Title,
                                Artist = string.Join(", ", kugouResult.Artists),
                                Album = kugouResult.Album,
                                DurationMs = kugouResult.DurationMs,
                                Source = "kugou"
                            });
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            response.Success = false;
            response.Error = ex.Message;
        }

        return response;
    }

    /// <summary>
    /// Get lyrics from QQ Music by song ID
    /// </summary>
    public async Task<LyricsResponse> GetQQMusicLyricsAsync(string songId)
    {
        var response = new LyricsResponse { Source = "qqmusic" };

        try
        {
            var lyrics = await _qqMusicApi.GetLyricsAsync(songId);

            if (lyrics == null || string.IsNullOrEmpty(lyrics.Lyrics))
            {
                response.Success = false;
                response.Error = "No lyrics found";
                return response;
            }

            response.Success = true;
            response.HasSyllableTiming = lyrics.Lyrics.Contains("(") && lyrics.Lyrics.Contains(",");
            response.Lyrics = new LyricsData
            {
                RawLyrics = lyrics.Lyrics,
                Translation = lyrics.Trans,
                Lines = ParseQrcLyrics(lyrics.Lyrics)
            };
        }
        catch (Exception ex)
        {
            response.Success = false;
            response.Error = ex.Message;
        }

        return response;
    }

    /// <summary>
    /// Get lyrics from Netease by song ID
    /// </summary>
    public async Task<LyricsResponse> GetNeteaseLyricsAsync(string songId)
    {
        var response = new LyricsResponse { Source = "netease" };

        try
        {
            var api = new Lyricify.Lyrics.Providers.Web.Netease.Api();
            var lyrics = await api.GetLyric(songId);

            if (lyrics == null || string.IsNullOrEmpty(lyrics.Lrc?.Lyric))
            {
                response.Success = false;
                response.Error = "No lyrics found";
                return response;
            }

            // Netease returns YRC format for syllable timing
            bool hasSyllable = !string.IsNullOrEmpty(lyrics.Yrc?.Lyric);
            
            response.Success = true;
            response.HasSyllableTiming = hasSyllable;
            response.Lyrics = new LyricsData
            {
                RawLyrics = hasSyllable ? lyrics.Yrc?.Lyric : lyrics.Lrc?.Lyric,
                Translation = lyrics.Tlyric?.Lyric
            };
        }
        catch (Exception ex)
        {
            response.Success = false;
            response.Error = ex.Message;
        }

        return response;
    }

    /// <summary>
    /// Get lyrics from Kugou by song hash (placeholder - needs lyrics search API)
    /// </summary>
    public async Task<LyricsResponse> GetKugouLyricsAsync(string songHash)
    {
        var response = new LyricsResponse { Source = "kugou" };

        try
        {
            var api = new Lyricify.Lyrics.Providers.Web.Kugou.Api();
            // Kugou requires two-step process: search lyrics then download
            var lyricsSearch = await api.GetSearchLyrics(hash: songHash);

            if (lyricsSearch == null || lyricsSearch.Candidates == null || lyricsSearch.Candidates.Count == 0)
            {
                response.Success = false;
                response.Error = "No lyrics found on Kugou";
                return response;
            }

            // For now, return metadata only - full implementation would download the lyrics
            response.Success = true;
            response.HasSyllableTiming = true; // KRC always has syllable timing
            response.Lyrics = new LyricsData
            {
                RawLyrics = $"[Kugou lyrics available: {lyricsSearch.Candidates.Count} results]"
            };
        }
        catch (Exception ex)
        {
            response.Success = false;
            response.Error = ex.Message;
        }

        return response;
    }

    /// <summary>
    /// Parse QRC format lyrics into structured data
    /// </summary>
    private List<LyricLine>? ParseQrcLyrics(string rawLyrics)
    {
        var lines = new List<LyricLine>();
        
        foreach (var lineText in rawLyrics.Split('\n'))
        {
            var match = QrcLineRegex.Match(lineText.Trim());
            if (!match.Success) continue;

            var startTime = int.Parse(match.Groups[1].Value);
            var duration = int.Parse(match.Groups[2].Value);
            var content = match.Groups[3].Value;

            var line = new LyricLine
            {
                StartTime = startTime,
                Duration = duration,
                Syllables = new List<Syllable>()
            };

            // Parse syllables
            var syllableMatches = QrcSyllableRegex.Matches(content);
            var textBuilder = new System.Text.StringBuilder();

            foreach (Match syllableMatch in syllableMatches)
            {
                var syllableText = syllableMatch.Groups[1].Value;
                var syllableStart = int.Parse(syllableMatch.Groups[2].Value);
                var syllableDuration = int.Parse(syllableMatch.Groups[3].Value);

                textBuilder.Append(syllableText);
                line.Syllables.Add(new Syllable
                {
                    Text = syllableText,
                    Start = syllableStart,
                    Duration = syllableDuration
                });
            }

            line.Text = textBuilder.ToString().Trim();
            if (!string.IsNullOrEmpty(line.Text))
            {
                lines.Add(line);
            }
        }

        return lines.Count > 0 ? lines : null;
    }
}
