FROM eclipse-temurin:24-jdk AS build

WORKDIR /app

COPY . .

RUN chmod +x mvnw && ./mvnw -DskipTests package

FROM eclipse-temurin:24-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8081} -jar app.jar"]