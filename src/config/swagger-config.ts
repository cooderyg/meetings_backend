import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

export const SWAGGER_API_DESCRIPTION = 'API 문서';

export function createDocumentBuilder({
  apiVersion,
  appName,
}: {
  apiVersion: string;
  appName: string;
}) {
  return new DocumentBuilder()
    .setTitle(appName)
    .setDescription(SWAGGER_API_DESCRIPTION)
    .setVersion(apiVersion)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token'
    )
    .build();
}

export const swaggerCustomOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
  },
  customSiteTitle: 'API 문서',
  customCss: '.swagger-ui .topbar { display: none }',
};
