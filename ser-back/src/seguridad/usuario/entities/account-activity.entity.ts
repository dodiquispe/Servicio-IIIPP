import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('account_activity', { schema: 'seguridad' })
@Index('ix_account_activity_usuario_fecha', ['id_usuario', 'fecha'])
export class AccountActivity {
  @PrimaryColumn({ type: 'varchar', length: 36 }) id: string;
  @Column({ type: 'varchar', length: 50 }) id_usuario: string;
  @Column({ type: 'varchar', length: 50 }) id_actor: string;
  @Column({ type: 'varchar', length: 60 }) accion: string;
  @Column({ type: 'jsonb', default: {} }) datos: Record<string, unknown>;
  @Column({ type: 'timestamptz' }) fecha: Date;
}
