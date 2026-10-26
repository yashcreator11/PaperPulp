using System;
using System.Collections.Generic;

namespace Application.DTOs
{
    public class CursorResult<T>
    {
        public List<T> Items { get; set; } = new();
        public DateTime? NextCursor { get; set; }
        public bool HasMore { get; set; }
    }
}

