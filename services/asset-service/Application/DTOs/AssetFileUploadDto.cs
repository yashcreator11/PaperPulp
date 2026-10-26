using System;
using System.Collections.Generic;

namespace Application.DTOs
{
    public class AssetUploadRequest
    {
        public List<AssetFileUploadDto> Assets { get; set; } = new();
    }

    public class AssetFileUploadDto
    {
        public string AssetName { get; set; } = string.Empty;

        public string? ParentName { get; set; }

        public int Level { get; set; }
    }
}