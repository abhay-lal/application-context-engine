import { Project } from 'ts-morph';
import { RouteTuple } from '../../schema/types';

export interface RouteDetector {
  name: string;
  detect(project: Project): RouteTuple[];
}
