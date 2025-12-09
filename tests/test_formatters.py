"""Tests for formatting utilities"""

import pytest
from utils.formatters import TimeFormatter, ProgressBarFormatter, TextFormatter


class TestTimeFormatter:
    """Test TimeFormatter class"""
    
    def test_format_seconds_minutes(self):
        """Test formatting seconds to MM:SS"""
        assert TimeFormatter.format_seconds(0) == "0:00"
        assert TimeFormatter.format_seconds(60) == "1:00"
        assert TimeFormatter.format_seconds(90) == "1:30"
        assert TimeFormatter.format_seconds(125) == "2:05"
        assert TimeFormatter.format_seconds(599) == "9:59"
    
    def test_format_seconds_hours(self):
        """Test formatting seconds to HH:MM:SS"""
        assert TimeFormatter.format_seconds(3600) == "1:00:00"
        assert TimeFormatter.format_seconds(3661) == "1:01:01"
        assert TimeFormatter.format_seconds(7200) == "2:00:00"
    
    def test_format_seconds_negative(self):
        """Test handling negative values"""
        assert TimeFormatter.format_seconds(-10) == "00:00"
    
    def test_format_seconds_string_input(self):
        """Test handling string input"""
        assert TimeFormatter.format_seconds("180") == "3:00"
        assert TimeFormatter.format_seconds("invalid") == "00:00"
    
    def test_format_milliseconds(self):
        """Test formatting milliseconds"""
        assert TimeFormatter.format_milliseconds(1000) == "0:01"
        assert TimeFormatter.format_milliseconds(60000) == "1:00"
        assert TimeFormatter.format_milliseconds(180000) == "3:00"
    
    def test_parse_time_string_mmss(self):
        """Test parsing MM:SS format"""
        assert TimeFormatter.parse_time_string("3:30") == 210
        assert TimeFormatter.parse_time_string("0:45") == 45
        assert TimeFormatter.parse_time_string("10:00") == 600
    
    def test_parse_time_string_hhmmss(self):
        """Test parsing HH:MM:SS format"""
        assert TimeFormatter.parse_time_string("1:00:00") == 3600
        assert TimeFormatter.parse_time_string("1:30:00") == 5400
        assert TimeFormatter.parse_time_string("2:15:30") == 8130
    
    def test_parse_time_string_invalid(self):
        """Test handling invalid time strings"""
        assert TimeFormatter.parse_time_string("invalid") is None
        assert TimeFormatter.parse_time_string("") is None
        assert TimeFormatter.parse_time_string("a:b:c") is None


class TestProgressBarFormatter:
    """Test ProgressBarFormatter class"""
    
    def test_generate_bar_empty(self):
        """Test empty progress bar"""
        bar = ProgressBarFormatter.generate_bar(0.0, length=10)
        assert len(bar) == 10
    
    def test_generate_bar_full(self):
        """Test full progress bar"""
        bar = ProgressBarFormatter.generate_bar(1.0, length=10)
        assert len(bar) == 10
    
    def test_generate_bar_middle(self):
        """Test half-filled progress bar"""
        bar = ProgressBarFormatter.generate_bar(0.5, length=10)
        assert len(bar) == 10
    
    def test_generate_bar_clamps_values(self):
        """Test that progress is clamped between 0 and 1"""
        bar_underflow = ProgressBarFormatter.generate_bar(-0.5, length=10)
        bar_overflow = ProgressBarFormatter.generate_bar(1.5, length=10)
        
        assert len(bar_underflow) == 10
        assert len(bar_overflow) == 10
    
    def test_generate_with_time(self):
        """Test progress bar with time labels"""
        result = ProgressBarFormatter.generate_with_time(90, 180, length=10)
        
        # Should contain time labels
        assert "1:30" in result
        assert "3:00" in result
    
    def test_generate_with_time_zero_total(self):
        """Test handling zero total time"""
        result = ProgressBarFormatter.generate_with_time(0, 0, length=10)
        
        assert "0:00" in result
    
    def test_generate_with_time_string_inputs(self):
        """Test handling string inputs"""
        result = ProgressBarFormatter.generate_with_time("90", "180", length=10)
        
        assert "1:30" in result
        assert "3:00" in result
    
    def test_generate_percentage(self):
        """Test progress bar with percentage"""
        result = ProgressBarFormatter.generate_percentage(0.5, length=10)
        
        assert "50%" in result


class TestTextFormatter:
    """Test TextFormatter class"""
    
    def test_truncate_short_text(self):
        """Test that short text is not truncated"""
        assert TextFormatter.truncate("hello", max_length=10) == "hello"
    
    def test_truncate_long_text(self):
        """Test that long text is truncated"""
        result = TextFormatter.truncate("hello world this is a long text", max_length=15)
        assert len(result) == 15
        assert result.endswith("...")
    
    def test_truncate_custom_suffix(self):
        """Test custom truncation suffix"""
        result = TextFormatter.truncate("hello world", max_length=10, suffix="…")
        assert result.endswith("…")
    
    def test_escape_markdown(self):
        """Test markdown escaping"""
        assert TextFormatter.escape_markdown("*bold*") == "\\*bold\\*"
        assert TextFormatter.escape_markdown("_italic_") == "\\_italic\\_"
        assert TextFormatter.escape_markdown("`code`") == "\\`code\\`"
        assert TextFormatter.escape_markdown("hello world") == "hello world"
    
    def test_format_list_empty(self):
        """Test empty list formatting"""
        assert TextFormatter.format_list([]) == "No items"
    
    def test_format_list_simple(self):
        """Test simple list formatting"""
        result = TextFormatter.format_list(["a", "b", "c"])
        
        assert "1. a" in result
        assert "2. b" in result
        assert "3. c" in result
    
    def test_format_list_max_items(self):
        """Test list truncation"""
        items = [f"item{i}" for i in range(20)]
        result = TextFormatter.format_list(items, max_items=5)
        
        assert "1. item0" in result
        assert "5. item4" in result
        assert "... and 15 more" in result
