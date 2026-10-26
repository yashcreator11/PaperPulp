namespace AuthMicroservice.Application.Dtos
{
    public class ApiLogDto
    {
        public int Id { get; set; }
        public DateTime TimeStamp { get; set; }
        public required string Message { get; set; }
        public required string UserName { get; set; }
        public required string Method { get; set; }
        public required string Path { get; set; }
        public int StatusCode { get; set; }
    }
}