# Multi-arch Azure SignalR Local Emulator
# The klabbet/signalr-emulator image is x86_64-only and crashes on ARM64
# (e.g. Apple Silicon). This Dockerfile builds from the .NET SDK, which
# supports both amd64 and arm64.

FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine

RUN dotnet tool install --global Microsoft.Azure.SignalR.Emulator

ENV PATH="/root/.dotnet/tools:${PATH}"

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8888

CMD ["/entrypoint.sh"]
