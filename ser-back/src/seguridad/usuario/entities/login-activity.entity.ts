import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('login_activity', { schema: 'seguridad' })
@Index('ix_login_activity_usuario_fecha', ['id_usuario', 'fecha'])
export class LoginActivity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  id_usuario: string | null;

  @Column({ type: 'varchar', length: 100 })
  nombre_usuario: string;

  @Column({ type: 'boolean' })
  exitoso: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  dispositivo: string | null;

  @Column({ type: 'timestamp with time zone' })
  fecha: Date;
}
