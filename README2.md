# Остановите контейнер перед экспортом
docker-compose down

# Экспорт тома в архив
docker run --rm -v nestjs_postgres_data:/source -v $(pwd):/backup alpine \
tar -czf /backup/docker-volumes/postgres_data.tar.gz -C /source .




# Распакуйте архив в том
docker run --rm -v nestjs_postgres_data:/target -v $(pwd):/backup alpine \
sh -c "rm -rf /target/* && tar -xzf /backup/docker-volumes/postgres_data.tar.gz -C /target"

# Запустите контейнер
docker-compose up -d