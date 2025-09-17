# AI Music Studio Backend

AI Music Studio Backend is a **NestJS** service providing REST APIs for users, projects, and media assets.  
It uses **PostgreSQL (TypeORM)** for persistence and **S3 (MinIO / Google Cloud Storage)** for object storage.  

Built as a Capstone project for the **Advanced Web Development Bootcamp** by [neue fische GmbH](https://www.neuefische.de/) (aka [Spiced Academy](https://www.spiced-academy.com/)).

## Key Features
- JWT-based user authentication (planned)  
- Project and media asset upload, listing, and download  
- AI-powered image analysis and music generation  
- Video rendering and processing  
- Notifications and webhooks for process tracking  
- YouTube integration (planned)  

## AI Usage
Users can create video slideshows by combining uploaded images with AI-generated audio.  
- Image descriptions are generated with **OpenAI Vision API**.  
- Descriptions are used by music generation models (**MiniMax, DyffRythm**) to create matching audio tracks.  
- Final videos (images + audio) are rendered as **MP4 files** for download or YouTube upload.  

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Build Docker images and upload to Dockerhub

To deploy your NestJS application with Docker, you can use the provided `docker-compose.production.yml` file. This file contains the necessary configuration to run your application in a production environment.

1. Setup environment variables in a `.env` file in the `backend` directory for dockerhub.

```env
# .env
DOCKER_REGISTRY_USERNAME=your_dockerhub_username
DOCKER_IMAGE_NAME=your_dockerhub_image_name
```

2. Setup other environment variables in the `.env.production.local` file as needed for your application (e.g., database connection details, API keys, etc.).

3. Build the Docker images:

```bash
$ docker-compose -f docker-compose.production.yml build
```

4. Test the Docker containers locally:

```bash
$ docker-compose -f docker-compose.production.yml up -d
```

5. Push the Docker images to Dockerhub:

```bash
$ docker-compose -f docker-compose.production.yml push
```

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
