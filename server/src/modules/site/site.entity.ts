import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sites')
export class Site {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  /** 草稿 DSL */
  @Column({ name: 'draft_schema', type: 'jsonb', nullable: true })
  draftSchema: Record<string, unknown> | null;

  /** 已发布快照 DSL */
  @Column({ name: 'published_schema', type: 'jsonb', nullable: true })
  publishedSchema: Record<string, unknown> | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ default: 'draft' })
  status: string;

  /** 站点是否被管理员禁用（与发布状态独立） */
  @Column({ default: false })
  disabled: boolean;

  /** 禁用原因，展示给访客 */
  @Column({ name: 'disabled_reason', nullable: true, type: 'text' })
  disabledReason: string | null;

  /** 站点有效期，到期后自动视为禁用 */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
