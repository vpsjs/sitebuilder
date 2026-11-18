import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('article_categories')
export class ArticleCategory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column() name: string;
  @Column({ nullable: true }) slug: string;
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'category_id', nullable: true }) categoryId: string | null;
  @Column() title: string;
  @Column({ nullable: true }) summary: string;
  @Column({ nullable: true }) content: string;
  @Column({ nullable: true }) cover: string;
  @Column({ default: 'published' }) status: string;
  @Column({ name: 'published_at', nullable: true, type: 'timestamptz' }) publishedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
