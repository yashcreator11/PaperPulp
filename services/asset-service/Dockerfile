FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
RUN apt-get update && apt-get install -y curl

ENV ASPNETCORE_URLS=http://+:5003
ENV ASPNETCORE_ENVIRONMENT=Production

COPY ./publish .

EXPOSE 5003
ENTRYPOINT ["dotnet", "Api.dll"]
