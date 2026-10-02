/**
 * 2D Kinematic Bicycle Model & Geodetic Positioning
 * Manual Driving Trainer — Phase 12
 */

import { KinematicsState } from './types';
import { clamp } from './physics';

export interface KinematicsConfig {
  wheelbase?: number; // meters, default: 2.60m
  maxSteerAngleRad?: number; // radians, default: ~35 deg (0.6108 rad)
  initialLatitude?: number; // default: 13.9314 (Lucena City, Quezon, Philippines)
  initialLongitude?: number; // default: 121.6172 (Lucena City, Quezon, Philippines)
  initialHeadingDegrees?: number; // default: 0 (North)
}

export class KinematicsModel {
  private readonly wheelbase: number;
  private readonly maxSteerAngleRad: number;
  private readonly initialLatitude: number;
  private readonly initialLongitude: number;
  private readonly initialHeadingDegrees: number;

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

    this.latitude = this.initialLatitude;
    this.longitude = this.initialLongitude;
    this.headingDegrees = ((this.initialHeadingDegrees % 360) + 360) % 360;
    this.headingRadians = (this.headingDegrees * Math.PI) / 180;
    this.yawRate = 0;
    this.worldX = 0;
    this.worldY = 0;
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

    // Steering angle delta
    const clampedSteering = clamp(normalizedSteering, -1.0, 1.0);
    const delta = clampedSteering * this.maxSteerAngleRad;

    // Yaw angular velocity (rad/s)
    // Positive delta (steering right) + positive speedMs (forward) => positive yawRate (turns clockwise towards East)
    this.yawRate = (speedMs / this.wheelbase) * Math.tan(delta);

    // Integrate heading angle (0 = North, PI/2 = East, PI = South, 3PI/2 = West)
    const TWO_PI = 2 * Math.PI;
    this.headingRadians = ((this.headingRadians + this.yawRate * dt) % TWO_PI + TWO_PI) % TWO_PI;
    this.headingDegrees = (this.headingRadians * 180) / Math.PI;

    // Metric displacement in world frame (dx = East/West, dy = North/South)
    const dx = speedMs * Math.sin(this.headingRadians) * dt;
    const dy = speedMs * Math.cos(this.headingRadians) * dt;

    // Geodetic projection (WGS-84 metric approximation: 1 degree latitude ~ 111,139 m)
    const dLat = dy / 111139;
    const latRad = (this.latitude * Math.PI) / 180;
    const cosLat = Math.cos(latRad);
    const dLon = dx / (111139 * (Math.abs(cosLat) > 1e-6 ? cosLat : 1e-6));

    this.latitude += dLat;
    this.longitude += dLon;
    this.worldX += dx;
    this.worldY += dy;
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
    };
  }

  /**
   * Reset kinematics to initial configured coordinates and orientation.
   */
  public reset(): void {
    this.latitude = this.initialLatitude;
    this.longitude = this.initialLongitude;
    this.headingDegrees = ((this.initialHeadingDegrees % 360) + 360) % 360;
    this.headingRadians = (this.headingDegrees * Math.PI) / 180;
    this.yawRate = 0;
    this.worldX = 0;
    this.worldY = 0;
  }
}
