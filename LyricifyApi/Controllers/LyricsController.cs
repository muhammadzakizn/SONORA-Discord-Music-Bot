using LyricifyApi.Models;
using LyricifyApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace LyricifyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LyricsController : ControllerBase
{
    private readonly LyricsService _lyricsService;

    public LyricsController(LyricsService lyricsService)
    {
        _lyricsService = lyricsService;
    }

    /// <summary>
    /// Search for songs across multiple sources
    /// </summary>
    /// <param name="title">Song title</param>
    /// <param name="artist">Artist name (optional)</param>
    /// <param name="source">Source filter: qqmusic, netease, kugou (optional)</param>
    [HttpGet("search")]
    public async Task<ActionResult<SearchResponse>> Search(
        [FromQuery] string title,
        [FromQuery] string? artist = null,
        [FromQuery] string? source = null)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest(new SearchResponse
            {
                Success = false,
                Error = "Title is required"
            });
        }

        var result = await _lyricsService.SearchAsync(title, artist ?? "", source);
        return Ok(result);
    }

    /// <summary>
    /// Get lyrics from QQ Music by song ID
    /// </summary>
    [HttpGet("qqmusic/{songId}")]
    public async Task<ActionResult<LyricsResponse>> GetQQMusicLyrics(string songId)
    {
        var result = await _lyricsService.GetQQMusicLyricsAsync(songId);
        return Ok(result);
    }

    /// <summary>
    /// Get lyrics from Netease by song ID
    /// </summary>
    [HttpGet("netease/{songId}")]
    public async Task<ActionResult<LyricsResponse>> GetNeteaseLyrics(string songId)
    {
        var result = await _lyricsService.GetNeteaseLyricsAsync(songId);
        return Ok(result);
    }

    /// <summary>
    /// Get lyrics from Kugou by song hash
    /// </summary>
    [HttpGet("kugou/{songHash}")]
    public async Task<ActionResult<LyricsResponse>> GetKugouLyrics(string songHash)
    {
        var result = await _lyricsService.GetKugouLyricsAsync(songHash);
        return Ok(result);
    }

    /// <summary>
    /// Convenience endpoint: search and get lyrics in one call
    /// </summary>
    [HttpGet("auto")]
    public async Task<ActionResult<LyricsResponse>> AutoGetLyrics(
        [FromQuery] string title,
        [FromQuery] string? artist = null)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest(new LyricsResponse
            {
                Success = false,
                Error = "Title is required"
            });
        }

        // Search first
        var searchResult = await _lyricsService.SearchAsync(title, artist ?? "", null);
        
        if (!searchResult.Success || searchResult.Results == null || searchResult.Results.Count == 0)
        {
            return Ok(new LyricsResponse
            {
                Success = false,
                Error = "No songs found"
            });
        }

        // Try to get lyrics from the first result
        var firstResult = searchResult.Results[0];
        LyricsResponse? lyricsResult = null;

        switch (firstResult.Source)
        {
            case "qqmusic":
                lyricsResult = await _lyricsService.GetQQMusicLyricsAsync(firstResult.Id!);
                break;
            case "netease":
                lyricsResult = await _lyricsService.GetNeteaseLyricsAsync(firstResult.Id!);
                break;
            case "kugou":
                lyricsResult = await _lyricsService.GetKugouLyricsAsync(firstResult.Id!);
                break;
        }

        return Ok(lyricsResult ?? new LyricsResponse
        {
            Success = false,
            Error = "Failed to get lyrics from any source"
        });
    }
}
