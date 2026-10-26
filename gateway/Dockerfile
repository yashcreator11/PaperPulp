FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
RUN apt-get update && apt-get install -y curl

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

COPY ./publish .

EXPOSE 5000

ENTRYPOINT ["dotnet", "gateway.dll"]
