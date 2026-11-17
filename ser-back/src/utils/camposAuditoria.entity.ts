import { Field } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';

//@Entity()
export class CamposAuditoria {
  @Column({ length: 50, nullable: true })
  @Field()
  _user_created: string;

  @Column({ length: 50, nullable: true })
  @Field()
  _user_updated: string;

  @Column({ length: 50, nullable: true })
  @Field()
  _user_deleted: string;

  @Column({ type: 'timestamp', nullable: true })
  @Field()
  _created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Field()
  _updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Field(() => Date, { nullable: true })
  _deleted_at: Date | null;
}
