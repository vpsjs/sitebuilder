import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** 插件目录（全局表，不做 RLS）——管理端维护可用插件清单 */
@Entity('plugin_definitions')
export class PluginDefinition {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) code: string;
  @Column() name: string;
  @Column({ nullable: true, type: 'text' }) description: string;
  @Column({ default: 'general' }) category: string;
  @Column({ default: '1.0.0' }) version: string;
  @Column({ nullable: true }) author: string;
  @Column({ nullable: true }) icon: string;
  @Column({ name: 'config_schema', type: 'jsonb', default: () => "'[]'" }) configSchema: Record<string, unknown>[];
  @Column({ type: 'numeric', default: 0 }) price: number;
  @Column({ default: true }) enabled: boolean;
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
