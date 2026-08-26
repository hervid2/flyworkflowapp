import { IsLatitude, IsLongitude } from 'class-validator';

export class CoordinatesDto {
  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;
}
