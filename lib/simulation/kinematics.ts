/**
 * 2D Kinematic Bicycle Model, Geodetic Positioning & Road Boundary Enforcement
 * Manual Driving Trainer — Phase 12 & Phase 13
 */

import { KinematicsState, RoadBoundaryMode, RoadCollisionState } from './types';
import { clamp } from './physics';
import { RoadNetwork, CAR_HALF_WIDTH_METERS, SHOULDER_BUFFER_METERS, METERS_PER_LAT_DEGREE } from './roadNetwork';

export interface KinematicsConfig {
  wheelbase?: number; // meters, default: 2.60m
  maxSteerAngleRad?: number; // radians, default: ~35 deg (0.6108 rad)
  initialLatitude?: number; // default: 13.9314 (Lucena City, Quezon, Philippines)
  initialLongitude?: number; // default: 121.6172 (Lucena City, Quezon, Philippines)
  initialHeadingDegrees?: number; // default: 0 (North)
  boundaryMode?: RoadBoundaryMode; // default: 'strict'
  roadNetwork?: RoadNetwork;
}

export const STATIC_OFF_COLLISION: RoadCollisionState = {
  isColliding: false,
  curbContact: false,
  roadName: '',
  distanceToCurb: 0,
  roadWidth: 0,
  boundaryMode: 'off',
};

export class KinematicsModel {
  private readonly wheelbase: number;
  private readonly maxSteerAngleRad: number;
  private readonly initialLatitude: number;
  private readonly initialLongitude: number;
  private readonly initialHeadingDegrees: number;
  private readonly initialBoundaryMode: RoadBoundaryMode;

  private roadNetwork: RoadNetwork;
  private boundaryMode: RoadBoundaryMode;
  private collision: RoadCollisionState;

  private latitude: number;
  private longitude: number;
  private headingRadians: number;
  private headingDegrees: number;
  private yawRate: number;
  private worldX: number;
  private worldY: number;

  constructor(config?: KinematicsConfig) {
    this.wheelbase = config?.wheelbase ?? 2.60;
    this.maxSteerAngleRad = config?.maxSteerAngleRad ?? (Math.PI * 35) / 180;
    this.initialLatitude = config?.initialLatitude ?? 13.9314;
    this.initialLongitude = config?.initialLongitude ?? 121.6172;
    this.initialHeadingDegrees = config?.initialHeadingDegrees ?? 0;
    this.initialBoundaryMode = config?.boundaryMode ?? 'strict';

    this.roadNetwork = config?.roadNetwork ?? RoadNetwork.getInstance();
    this.boundaryMode = this.initialBoundaryMode;

    this.latitude = this.initialLatitude;
    this.longitude = this.initialLongitude;
    this.headingDegrees = ((this.initialHeadingDegrees % 360) + 360) % 360;
    this.headingRadians = (this.headingDegrees * Math.PI) / 180;
    this.yawRate = 0;
    this.worldX = 0;
    this.worldY = 0;

    this.collision = this.evaluateCollision(this.latitude, this.longitude);
  }

  /**
   * Set road collision enforcement mode:
   * - 'strict': Clamp vehicle inside corridor and prevent mounting curbs / sidewalks
   * - 'soft': Allow leaving corridor but report collisions
   * - 'off': Completely unrestricted free roaming
   */
  public setBoundaryMode(mode: RoadBoundaryMode): void {
    this.boundaryMode = mode;
    if (mode === 'off') {
      this.collision = STATIC_OFF_COLLISION;
    } else {
      this.collision = this.evaluateCollision(this.latitude, this.longitude);
    }
  }

  public getBoundaryMode(): RoadBoundaryMode {
    return this.boundaryMode;
  }

  public getCollisionState(): RoadCollisionState {
    return this.collision;
  }

  public getRoadNetwork(): RoadNetwork {
    return this.roadNetwork;
  }

  public setRoadNetwork(network: RoadNetwork): void {
    this.roadNetwork = network;
    this.collision = this.evaluateCollision(this.latitude, this.longitude);
  }

  /**
   * Integrate 2D kinematic motion over time step dt.
   *
   * @param speedMs Longitudinal velocity in m/s (signed, negative in reverse)
   * @param normalizedSteering Steering input from -1.0 (full left) to +1.0 (full right)
   * @param dt Delta time in seconds
   */
  public update(speedMs: number, normalizedSteering: number, dt: number): void {
    if (dt <= 0) return;

    // 1. Steering angle delta & yaw rate
    const clampedSteering = clamp(normalizedSteering, -1.0, 1.0);
    const delta = clampedSteering * this.maxSteerAngleRad;

    // Positive delta (steering right) + positive speedMs (forward) => positive yawRate (turns clockwise towards East)
    this.yawRate = (speedMs / this.wheelbase) * Math.tan(delta);

    // Integrate heading angle (0 = North, PI/2 = East, PI = South, 3PI/2 = West)
    const TWO_PI = 2 * Math.PI;
    this.headingRadians = ((this.headingRadians + this.yawRate * dt) % TWO_PI + TWO_PI) % TWO_PI;
    this.headingDegrees = (this.headingRadians * 180) / Math.PI;

    // 2. Metric displacement in world frame (dx = East/West, dy = North/South)
    let dx = speedMs * Math.sin(this.headingRadians) * dt;
    let dy = speedMs * Math.cos(this.headingRadians) * dt;

    // Geodetic projection (WGS-84 metric approximation)
    const dLat = dy / METERS_PER_LAT_DEGREE;
    const latRad = (this.latitude * Math.PI) / 180;
    const cosLat = Math.cos(latRad);
    const dLon = dx / (METERS_PER_LAT_DEGREE * (Math.abs(cosLat) > 1e-6 ? cosLat : 1e-6));

    let prospectiveLat = this.latitude + dLat;
    let prospectiveLon = this.longitude + dLon;

    // 3. Boundary & Collision Enforcement
    if (this.boundaryMode === 'off') {
      this.latitude = prospectiveLat;
      this.longitude = prospectiveLon;
      this.worldX += dx;
      this.worldY += dy;
      this.collision = STATIC_OFF_COLLISION;
      return;
    }

    const nearest = this.roadNetwork.findNearestRoad(prospectiveLat, prospectiveLon);
    if (!nearest) {
      this.latitude = prospectiveLat;
      this.longitude = prospectiveLon;
      this.worldX += dx;
      this.worldY += dy;
      this.collision = {
        isColliding: false,
        curbContact: false,
        roadName: '',
        distanceToCurb: 0,
        roadWidth: 0,
        boundaryMode: this.boundaryMode,
      };
      return;
    }

    // Usable corridor half-width with generous shoulder buffer minus standard vehicle half-width
    const effectiveHalfWidth = nearest.halfWidth + SHOULDER_BUFFER_METERS;
    const maxCenterlineDist = Math.max(0.5, effectiveHalfWidth - CAR_HALF_WIDTH_METERS);
    const dPerp = nearest.distanceToCenterline;
    const isContact = dPerp >= maxCenterlineDist;
    const distanceToCurb = Math.max(0, effectiveHalfWidth - dPerp);

    if (this.boundaryMode === 'soft') {
      this.latitude = prospectiveLat;
      this.longitude = prospectiveLon;
      this.worldX += dx;
      this.worldY += dy;
      this.collision = {
        isColliding: isContact,
        curbContact: isContact,
        roadName: nearest.roadName,
        distanceToCurb,
        roadWidth: nearest.roadWidth,
        boundaryMode: 'soft',
      };
      return;
    }

    // 'strict' boundary mode: clamp vehicle center inside the road corridor
    if (isContact) {
      const penetration = dPerp - maxCenterlineDist;
      // nearest.normal points inward toward road centerline (x = East, y = North)
      const correctionMetersX = penetration * nearest.normal.x;
      const correctionMetersY = penetration * nearest.normal.y;

      const corrDLat = correctionMetersY / METERS_PER_LAT_DEGREE;
      const corrDLon = correctionMetersX / (METERS_PER_LAT_DEGREE * (Math.abs(cosLat) > 1e-6 ? cosLat : 1e-6));

      prospectiveLat += corrDLat;
      prospectiveLon += corrDLon;
      dx += correctionMetersX;
      dy += correctionMetersY;

      this.latitude = prospectiveLat;
      this.longitude = prospectiveLon;
      this.worldX += dx;
      this.worldY += dy;

      // Deflect heading to slide smoothly along road edge rather than jerky snapping
      const headingEast = Math.sin(this.headingRadians);
      const headingNorth = Math.cos(this.headingRadians);
      const normalDotHeading = nearest.normal.x * headingEast + nearest.normal.y * headingNorth;
      if (normalDotHeading < -0.05) {
        const tangentDot = nearest.tangent.x * headingEast + nearest.tangent.y * headingNorth;
        const forwardSign = tangentDot >= 0 ? 1 : -1;
        const targetRad = Math.atan2(forwardSign * nearest.tangent.x, forwardSign * nearest.tangent.y);
        const TWO_PI = 2 * Math.PI;
        let diff = (targetRad - this.headingRadians) % TWO_PI;
        if (diff > Math.PI) diff -= TWO_PI;
        if (diff < -Math.PI) diff += TWO_PI;
        this.headingRadians = ((this.headingRadians + diff * Math.min(1.0, 4.0 * dt)) % TWO_PI + TWO_PI) % TWO_PI;
        this.headingDegrees = (this.headingRadians * 180) / Math.PI;
      }

      this.collision = {
        isColliding: true,
        curbContact: true,
        roadName: nearest.roadName,
        distanceToCurb: CAR_HALF_WIDTH_METERS,
        roadWidth: nearest.roadWidth,
        boundaryMode: 'strict',
      };
    } else {
      this.latitude = prospectiveLat;
      this.longitude = prospectiveLon;
      this.worldX += dx;
      this.worldY += dy;

      this.collision = {
        isColliding: false,
        curbContact: false,
        roadName: nearest.roadName,
        distanceToCurb,
        roadWidth: nearest.roadWidth,
        boundaryMode: 'strict',
      };
    }
  }

  /**
   * Teleport or set vehicle coordinate and optional heading.
   * Resets local world displacement relative to the new spawn position.
   */
  public setPosition(latitude: number, longitude: number, headingDegrees?: number): void {
    this.latitude = latitude;
    this.longitude = longitude;
    if (headingDegrees !== undefined) {
      this.headingDegrees = ((headingDegrees % 360) + 360) % 360;
      this.headingRadians = (this.headingDegrees * Math.PI) / 180;
    }
    this.yawRate = 0;
    this.worldX = 0;
    this.worldY = 0;
    this.collision = this.evaluateCollision(this.latitude, this.longitude);
  }

  /**
   * Retrieve current kinematics telemetry snapshot.
   */
  public getState(): KinematicsState {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      headingDegrees: this.headingDegrees,
      headingRadians: this.headingRadians,
      yawRate: this.yawRate,
      worldX: this.worldX,
      worldY: this.worldY,
      collision: this.collision,
    };
  }

  /**
   * Reset kinematics to initial configured coordinates, orientation, and boundaries.
   */
  public reset(): void {
    this.latitude = this.initialLatitude;
    this.longitude = this.initialLongitude;
    this.headingDegrees = ((this.initialHeadingDegrees % 360) + 360) % 360;
    this.headingRadians = (this.headingDegrees * Math.PI) / 180;
    this.boundaryMode = this.initialBoundaryMode;
    this.yawRate = 0;
    this.worldX = 0;
    this.worldY = 0;
    this.collision = this.evaluateCollision(this.latitude, this.longitude);
  }

  private evaluateCollision(lat: number, lon: number): RoadCollisionState {
    if (this.boundaryMode === 'off') {
      return STATIC_OFF_COLLISION;
    }

    const nearest = this.roadNetwork.findNearestRoad(lat, lon);
    if (!nearest) {
      return {
        isColliding: false,
        curbContact: false,
        roadName: '',
        distanceToCurb: 0,
        roadWidth: 0,
        boundaryMode: this.boundaryMode,
      };
    }

    const effectiveHalfWidth = nearest.halfWidth + SHOULDER_BUFFER_METERS;
    const maxCenterlineDist = Math.max(0.5, effectiveHalfWidth - CAR_HALF_WIDTH_METERS);
    const isContact = nearest.distanceToCenterline >= maxCenterlineDist;
    const distanceToCurb = Math.max(0, effectiveHalfWidth - nearest.distanceToCenterline);

    return {
      isColliding: isContact,
      curbContact: isContact,
      roadName: nearest.roadName,
      distanceToCurb,
      roadWidth: nearest.roadWidth,
      boundaryMode: this.boundaryMode,
    };
  }
}
