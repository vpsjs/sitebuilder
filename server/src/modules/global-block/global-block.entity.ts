import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** 全局组件：可复用的单个 DslNode（header/footer 等），改一次全站同步 */
@Entity('global_blocks')
export class GlobalBlock {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', nullable: true }) tenantId: string | null;
  @Column() name: string;
  @Column({ nullable: true }) category: string;
  @Column({ nullable: true }) description: string;
  @Column({ nullable: true }) cover: string;
  @Column({ type: 'jsonb' }) node: Record<string, unknown>;
  @Column({ name: 'is_global', default: false }) isGlobal: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
