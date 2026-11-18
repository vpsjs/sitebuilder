import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  cover: string;

  /** 页面 DSL（JSONB） */
  @Column({ type: 'jsonb' })
  schema: Record<string, unknown>;

  @Column({ name: 'is_global', default: false })
  isGlobal: boolean;

  /** 模板市场：是否上架 */
  @Column({ name: 'is_public', default: false }) isPublic: boolean;
  @Column({ type: 'numeric', default: 0 }) price: number;
  @Column({ default: 0 }) installs: number;
  @Column({ type: 'numeric', default: 5 }) rating: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
