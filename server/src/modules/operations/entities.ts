import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'site_id' }) siteId: string;
  @Column() name: string;
  @Column() slug: string;
  @Column({ name: 'is_home', default: false }) isHome: boolean;
  @Column({ name: 'draft_schema', type: 'jsonb', nullable: true }) draftSchema: Record<string, unknown>;
  @Column({ name: 'published_schema', type: 'jsonb', nullable: true }) publishedSchema: Record<string, unknown>;
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true }) publishedAt: Date;
  @Column({ default: 'draft' }) status: string;
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('domains')
export class Domain {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'site_id' }) siteId: string;
  @Column() domain: string;
  @Column({ default: false }) verified: boolean;
  @Column({ name: 'verify_token', nullable: true }) verifyToken: string;
  @Column({ name: 'ssl_status', default: 'pending' }) sslStatus: string;
  @Column({ name: 'ssl_expires', type: 'timestamptz', nullable: true }) sslExpires: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('form_submissions')
export class FormSubmission {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'site_id', nullable: true }) siteId: string;
  @Column({ name: 'page_id', nullable: true }) pageId: string;
  @Column({ name: 'form_id' }) formId: string;
  @Column({ type: 'jsonb' }) data: Record<string, unknown>;
  @Column({ default: 'unread' }) status: string;
  @Column({ name: 'source_url', nullable: true }) sourceUrl: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', nullable: true }) tenantId: string;
  @Column({ name: 'user_id', nullable: true }) userId: string;
  @Column() action: string;
  @Column({ name: 'target_type', nullable: true }) targetType: string;
  @Column({ name: 'target_id', nullable: true }) targetId: string;
  @Column({ type: 'jsonb', default: {} }) meta: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('analytics_events')
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'site_id', nullable: true }) siteId: string;
  @Column({ name: 'page_id', nullable: true }) pageId: string;
  @Column() type: string;
  @Column({ type: 'jsonb', default: {} }) data: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('plugin_installs')
export class PluginInstall {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'plugin_id' }) pluginId: string;
  @Column({ type: 'jsonb', default: {} }) config: Record<string, unknown>;
  @Column({ default: true }) enabled: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
