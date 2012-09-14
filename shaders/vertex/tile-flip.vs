/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 * Copyright (c) 2012 Branislav Ulicny
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

precision mediump float;

// Built-in attributes

attribute vec4 a_position;
attribute vec2 a_texCoord;
attribute vec3 a_triangleCoord;

// Built-in uniforms

uniform mat4 u_projectionMatrix;
uniform vec2 u_meshSize;

// Uniform passed in from CSS

//uniform mat4 transform;
mat4 transform = mat4(1.0);
//uniform float amount;
float amount = 0.1;
//uniform float strength;
float strength = 0.1;
//uniform float randomness;
float randomness = 2.0;
//uniform vec3 axis;
vec3 axis = vec3(0.0, 1.0, 0.0);

//uniform vec2 meshSize;
vec2 meshSize = vec2(50.0, 50.0);
//uniform vec2 textureSize;
vec2 textureSize = vec2(680.0, 530.0);

// Varyings

varying float v_depth;
varying vec2 v_uv;

// Constants

const float PI2 = 1.5707963267948966 * 1.0;

// Create perspective matrix

mat4 perspectiveMatrix( float p ) {

    float perspective = - 1.0 / p;
    return mat4(
	1.0, 0.0, 0.0, 0.0,
	0.0, 1.0, 0.0, 0.0,
	0.0, 0.0, 1.0, perspective,
	0.0, 0.0, 0.0, 1.0 );

}

// Rotate vector

vec3 rotateVectorByQuaternion( vec3 v, vec4 q ) {

	vec3 dest = vec3( 0.0 );

	float x = v.x, y  = v.y, z  = v.z;
	float qx = q.x, qy = q.y, qz = q.z, qw = q.w;

	// calculate quaternion * vector

	float ix =  qw * x + qy * z - qz * y,
		  iy =  qw * y + qz * x - qx * z,
		  iz =  qw * z + qx * y - qy * x,
		  iw = -qx * x - qy * y - qz * z;

	// calculate result * inverse quaternion

	dest.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
	dest.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
	dest.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;

	return dest;

}

// Convert rotation

vec4 axisAngleToQuaternion( vec3 axis, float angle ) {

	vec4 dest = vec4( 0.0 );

	float halfAngle = angle / 2.0,
		  s = sin( halfAngle );

	dest.x = axis.x * s;
	dest.y = axis.y * s;
	dest.z = axis.z * s;
	dest.w = cos( halfAngle );

	return dest;

}

// Random function based on the tile coordinate.
// This will return the same value for all the vertices in the same tile
// (i.e. two triangles).

float random( vec2 scale ) {

    // Use the fragment position as a different seed per-pixel.

    return fract( sin( dot( vec2( a_triangleCoord.x, a_triangleCoord.y ), scale ) ) * 4000.0 );

}

void main() {

	vec4 pos = a_position;

	float aspect = textureSize.x / textureSize.y;

	// built-in uniform doesn't work yet
	//float cx = a_triangleCoord.x / u_meshSize.x - 0.5 + 0.5 / meshSize.x;
	//float cy = a_triangleCoord.y / u_meshSize.y - 0.5 + 0.5 / meshSize.y;

	// must flip meshSize.x and meshSize.y to match mesh tessellation
	// seems implementation doesn't follow spec
	// and is actually [rows columns] instead of [columns rows]

	float cx = a_triangleCoord.x / meshSize.y - 0.5 + 0.5 / meshSize.y;
	float cy = a_triangleCoord.y / meshSize.x - 0.5 + 0.5 / meshSize.x;

	vec3 centroid = vec3( cx, cy, 0.0 );

	float r = random( vec2( 10.0, 80.0 ) );

	float rr = mix( 0.0, PI2, amount * ( 1.0 + randomness * r ) );

	vec4 rotation = vec4( axis, rr );
	vec4 qRotation = axisAngleToQuaternion( normalize( rotation.xyz ), rotation.w );

	vec3 newPosition = rotateVectorByQuaternion( ( pos.xyz - centroid ) * vec3( aspect, 1., 1.0 ), qRotation ) * vec3( 1.0/aspect, 1.0, 1.0 ) + centroid;
	pos.xyz = newPosition;
	//pos.z += strength * abs( rr );

    //gl_Position = u_projectionMatrix * perspectiveMatrix( 0.9 ) * transform * pos;
	gl_Position = u_projectionMatrix * transform * pos;

	// Pass in varyings

	v_depth = abs( rr ) / PI2;
	v_uv = a_texCoord;

}
