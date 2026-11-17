import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('sys_token', { schema: 'seguridad' })
@Index('ix_sys_token_usuario_activo', ['id_usuario', 'revocado_en'])
export class SysToken {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  id_usuario: string;

  @Column({ type: 'timestamp with time zone' })
  vence_en: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  revocado_en: Date | null;
}
