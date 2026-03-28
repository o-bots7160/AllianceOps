# Multi-arch Azure SignalR Local Emulator
# The klabbet/signalr-emulator image is x86_64-only and crashes on ARM64
# (e.g. Apple Silicon). This Dockerfile builds from the .NET SDK, which
# supports both amd64 and arm64.

FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine

# Disable NuGet signature verification — avoids timeouts reaching the
# repository-signatures endpoint on Linux/Alpine Docker builds.
ENV DOTNET_NUGET_SIGNATURE_VERIFICATION=false

RUN dotnet tool install --global Microsoft.Azure.SignalR.Emulator \
    || (echo "Retry 1..." && sleep 5 && dotnet tool install --global Microsoft.Azure.SignalR.Emulator) \
    || (echo "Retry 2..." && sleep 10 && dotnet tool install --global Microsoft.Azure.SignalR.Emulator)

ENV PATH="/root/.dotnet/tools:${PATH}"

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8888

CMD ["/entrypoint.sh"]
