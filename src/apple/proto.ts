import protobuf from "protobufjs";

const mapTile = `
syntax = "proto3";
package streetlevel;

message GroundMetadataTile {
  repeated PhotoPosition pano = 1;
  repeated GroundDataBuild build_table = 4;
  repeated CameraMetadata camera_metadata = 5;
  TileCoordinate tile_coordinate = 6;
  
  message PhotoPosition {
    uint64 panoid = 1;
    
    int32 revision = 4;
    
    int64 timestamp = 5;
    
    int32 build_table_idx = 7;
    
    repeated int32 camera_metadata_idx = 9;
    
    OrientedTilePosition tile_position = 10;
    
    RigMetrics rig_metrics = 12;
    
    message OrientedTilePosition {
      int32 x = 1;
      int32 y = 2;
      
      int32 altitude = 3;
      
      int32 yaw = 4;
      int32 pitch = 5;
      int32 roll = 6;
    }
    
    message RigMetrics {
      repeated int32 occlusion_score = 1;
    }
  }
  
  message GroundDataBuild {
    int32 index = 1;
    
    uint64 build_id = 3;
    int32 data_format_version = 5;
    
    CoverageType coverage_type = 6;

    int32 bucket_id = 9;
    int32 lod_with_textures = 10;
    int32 metrics_version = 11;
    int32 data_output_version = 12;
    
    enum CoverageType {
      DEFAULT = 0;
      CAR = 2;
      BACKPACK = 3;
    }
  }
}


message CameraMetadata {
  int32 camera_number = 1;
  LensProjection lens_projection = 4;
  OrientedPosition position = 5;
  int32 texture_id = 6;

  message LensProjection {
    int32 type = 1;

    double fov_s = 2;
    double fov_h = 3;

    // lens distortion?
    double k2 = 4;
    double k3 = 5;
    double k4 = 6;

    // principal point?
    double cx = 7;
    double cy = 8;

    // ???
    double lx = 9;
    double ly = 10;
  }

  message OrientedPosition {
    double x = 1;
    double y = 2;
    double z = 3;
    double yaw = 4;
    double pitch = 5;
    double roll = 6;
  }
}

message TileCoordinate {
  int32 x = 1;
  int32 y = 2;
  int32 z = 3;
}
`;

export class Proto {
  static async parseMapTile(payload: ArrayBuffer): Promise<any> {
    const array = new Uint8Array(payload);
    const root = protobuf.parse(mapTile).root;
    const type = root.lookupType("GroundMetadataTile");
    const message = type.decode(array);
    return type.toObject(message, { defaults: true });
  }

}
