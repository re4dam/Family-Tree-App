# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj files and restore dependencies
COPY FamilyTree.slnx ./
COPY src/FamilyTree.Api/FamilyTree.Api.csproj src/FamilyTree.Api/
COPY src/FamilyTree.Core/FamilyTree.Core.csproj src/FamilyTree.Core/
COPY src/FamilyTree.Infrastructure/FamilyTree.Infrastructure.csproj src/FamilyTree.Infrastructure/

RUN dotnet restore

# Copy all remaining source code and publish
COPY src/ src/
RUN dotnet publish src/FamilyTree.Api/FamilyTree.Api.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Set environment variables
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Development
EXPOSE 5000

ENTRYPOINT ["dotnet", "FamilyTree.Api.dll"]
