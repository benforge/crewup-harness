import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { ApiException } from '../src/common/errors/api.exception';
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter';

type ResponseTag = { slug: string; name?: string };
type ResponseCategory = { slug: string; name?: string };
type ResponseArticle = {
  slug: string;
  category?: ResponseCategory;
  tags: ResponseTag[];
  viewCount?: number;
};

describe('Blog API MVP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (errors) =>
          ApiException.validation(
            errors.map((error) => ({
              field: error.property,
              constraints: error.constraints ?? {},
            })),
          ),
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists published articles', async () => {
    const response = await request(app.getHttpServer()).get('/api/articles').expect(200);

    expect(response.body.items).toHaveLength(2);
    expect(response.body.items.map((article: ResponseArticle) => article.slug)).toContain('hello-world');
    expect(response.body.items.some((article: ResponseArticle) => article.slug === 'draft-notes')).toBe(false);
  });

  it('returns published article details', async () => {
    const response = await request(app.getHttpServer()).get('/api/articles/hello-world').expect(200);

    expect(response.body.article.title).toBe('Hello World');
    expect(response.body.article.body).toContain('MVP+');
    expect(response.body.article.category.slug).toBe('product-notes');
    expect(response.body.article.tags.map((tag: ResponseTag) => tag.slug)).toContain('seo');
    expect(response.body.article.viewCount).toBe(0);
  });

  it('does not increment view count on GET article details', async () => {
    const server = app.getHttpServer();

    const first = await request(server).get('/api/articles/hello-world').expect(200);
    const second = await request(server).get('/api/articles/hello-world').expect(200);

    expect(first.body.article.viewCount).toBe(0);
    expect(second.body.article.viewCount).toBe(0);
  });

  it('increments view count on POST article view', async () => {
    const server = app.getHttpServer();

    const first = await request(server).post('/api/articles/hello-world/view').expect(200);
    const second = await request(server).post('/api/articles/hello-world/view').expect(200);
    const article = await request(server).get('/api/articles/hello-world').expect(200);

    expect(first.body.viewCount).toBe(1);
    expect(second.body.viewCount).toBe(2);
    expect(article.body.article.viewCount).toBe(2);
  });

  it('does not expose draft article details publicly', async () => {
    const response = await request(app.getHttpServer()).get('/api/articles/draft-notes').expect(404);

    expect(response.body.error.code).toBe('ARTICLE_NOT_FOUND');
  });

  it('does not increment view count for missing or draft articles', async () => {
    const server = app.getHttpServer();

    await request(server).post('/api/articles/missing/view').expect(404);
    await request(server).post('/api/articles/draft-notes/view').expect(404);

    const article = await request(server).get('/api/articles/hello-world').expect(200);
    expect(article.body.article.viewCount).toBe(0);
  });

  it('lists categories and category articles', async () => {
    const categories = await request(app.getHttpServer()).get('/api/categories').expect(200);
    const category = categories.body.items.find((item: ResponseCategory) => item.slug === 'product-notes');

    expect(category.name).toBe('产品笔记');

    const response = await request(app.getHttpServer()).get('/api/categories/product-notes/articles').expect(200);
    expect(response.body.items.every((article: ResponseArticle) => article.category?.slug === 'product-notes')).toBe(true);
  });

  it('lists tags and tag articles', async () => {
    const tags = await request(app.getHttpServer()).get('/api/tags').expect(200);
    const tag = tags.body.items.find((item: ResponseTag) => item.slug === 'seo');

    expect(tag.name).toBe('SEO');

    const response = await request(app.getHttpServer()).get('/api/tags/seo/articles').expect(200);
    expect(response.body.items.every((article: ResponseArticle) => article.tags.some((item: ResponseTag) => item.slug === 'seo'))).toBe(true);
  });

  it('returns an error for invalid login', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: 'AUTH_INVALID',
        message: 'Invalid username or password',
      },
    });
  });

  it('logs in an admin', async () => {
    const response = await login(app);

    expect(response.body.token).toBe('dev-admin-token');
    expect(response.body.admin.role).toBe('editor');
  });

  it('rejects unauthenticated admin requests', async () => {
    const response = await request(app.getHttpServer()).get('/api/admin/articles').expect(401);

    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns current admin', async () => {
    const token = (await login(app)).body.token;
    const response = await request(app.getHttpServer())
      .get('/api/admin/me')
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.admin.role).toBe('editor');
  });

  it('exposes view count in admin article lists', async () => {
    const token = (await login(app)).body.token;
    const response = await request(app.getHttpServer())
      .get('/api/admin/articles')
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.items.every((article: ResponseArticle) => typeof article.viewCount === 'number')).toBe(true);
  });

  it('saves a draft article', async () => {
    const token = (await login(app)).body.token;
    const response = await createDraft(app, token);

    expect(response.body.article.status).toBe('draft');
    expect(response.body.article.slug).toBe('second-post');
  });

  it('updates a draft article', async () => {
    const token = (await login(app)).body.token;
    const draft = await createDraft(app, token);

    const response = await request(app.getHttpServer())
      .patch(`/api/admin/articles/${draft.body.article.id}`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'Updated Second Post', tags: ['seo'] })
      .expect(200);

    expect(response.body.article.title).toBe('Updated Second Post');
    expect(response.body.article.tags.map((tag: ResponseTag) => tag.slug)).toContain('seo');
  });

  it('publishes a draft article', async () => {
    const token = (await login(app)).body.token;
    const draft = await createDraft(app, token);

    const response = await request(app.getHttpServer())
      .post(`/api/admin/articles/${draft.body.article.id}/publish`)
      .set('authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    expect(response.body.article.status).toBe('published');
    expect(response.body.article.publishedAt).toBeTruthy();
  });

  it('unpublishes an article', async () => {
    const token = (await login(app)).body.token;
    const draft = await createDraft(app, token);
    const published = await request(app.getHttpServer())
      .post(`/api/admin/articles/${draft.body.article.id}/publish`)
      .set('authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/admin/articles/${published.body.article.id}/unpublish`)
      .set('authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    expect(response.body.article.status).toBe('draft');
    expect(response.body.article.publishedAt).toBeNull();
  });

  it('creates categories and tags', async () => {
    const token = (await login(app)).body.token;

    const category = await request(app.getHttpServer())
      .post('/api/admin/categories')
      .set('authorization', `Bearer ${token}`)
      .send({ slug: 'systems', name: '系统设计', description: '系统设计文章' })
      .expect(201);
    const tag = await request(app.getHttpServer())
      .post('/api/admin/tags')
      .set('authorization', `Bearer ${token}`)
      .send({ slug: 'architecture', name: '架构' })
      .expect(201);

    expect(category.body.category.slug).toBe('systems');
    expect(tag.body.tag.slug).toBe('architecture');
  });
});

function login(app: INestApplication) {
  return request(app.getHttpServer())
    .post('/api/admin/login')
    .send({ username: 'admin', password: 'admin123' })
    .expect(201);
}

function createDraft(app: INestApplication, token: string) {
  return request(app.getHttpServer())
    .post('/api/admin/articles')
    .set('authorization', `Bearer ${token}`)
    .send({
      slug: 'second-post',
      title: 'Second Post',
      summary: 'A second article.',
      body: 'More content.',
      tags: ['update'],
      aiSummary: 'A short AI summary.',
    })
    .expect(201);
}
