import React, { useRef, useEffect } from 'react';
import './App.css';
import {
  GoogleMap, useJsApiLoader,
  DirectionsRenderer,
  InfoWindow,
  Autocomplete,
} from '@react-google-maps/api';


//Map Key
//AIzaSyAwFPLZIa-3fk07Hq0sAjyaPvYOMTfzyBo


const DIRECTIONS_OPTIONS = { suppressMarkers: true, preserveViewport: true }

const DIRECTIONS_OPTIONS_OJ = {
  suppressMarkers: true, preserveViewport: true, polylineOptions: {
    strokeColor: '#FFA500', strokeOpacity: 0.9,
    strokeWeight: 3
  }
}


const directionsRequest = ({ DirectionsService, origin, destination }: {
  DirectionsService: any, origin: { lat: number, lon: number }, destination: { lat: number, lon: number }
}) =>
  new Promise((resolve, reject) => {
    DirectionsService.route(
      {
        origin: new window.google.maps.LatLng(origin.lat, origin.lon),
        destination: new window.google.maps.LatLng(
          destination.lat,
          destination.lon
        ),
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true
      },
      (result: unknown, status: google.maps.DirectionsStatus) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          resolve(result)
        } else {
          reject(status)
        }
      }
    )
  })

const containerStyle = {
  width: '100vw',
  height: '100vh'
};

const center = { lat: -32, lng: 116 }

const DIRECTION_REQUEST_DELAY = 300

const delay = (time: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, time)
  })


function computeTotalDistance(myroute: any) {
  let total = 0;

  if (!myroute) {
    return;
  }

  for (let i = 0; i < myroute.legs.length; i++) {
    total += myroute.legs[i]!.distance!.value;
  }

  return total / 1000;
}


//@ts-ignore
async function findBestRoute(elavationService: any, myRoutes: any[]) {
  myRoutes.map((route: any, i: number) => {
    return {
      originalData: route,
      distanceWithElevation: computeTotalElavation(elavationService, route)
    }
  })


  const best = myRoutes.sort((a: any, b: any) => (a.distanceWithElevation + a.legs[0].distance.value) - (b.distanceWithElevation + b.legs[0].distance.value))[0]
  return best
}


async function computeTotalElavation(ElavationService: any, myroute: any) {
  if (!myroute) {
    return;
  }
  const res = await ElavationService.getElevationAlongPath({
    path: myroute.overview_path,
    samples: 64,
  })

  let startingElevation = res.results[0].elevation
  let elevationChange = 0
  res.results.map((a: any, i: number) => {
    elevationChange += Math.abs(startingElevation - a.elevation)
    startingElevation = a.elevation
  })

  return elevationChange
}

function App() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyAwFPLZIa-3fk07Hq0sAjyaPvYOMTfzyBo",
    libraries: ['places']
  })

  const [map, setMap] = React.useState(null)

  const searchElFrom = useRef(null)
  const searchElTo = useRef(null)
  const DirectionsService = useRef(null)
  const ElavationService = useRef(null)
  const [directions, setDirections] = React.useState<any>({})
  const [OptResult, setOptResult] = React.useState<any>({})

  const [searchResultFrom, setSearchResultFrom] = React.useState<any>()
  const [searchResultTo, setSearchResultTo] = React.useState<any>()
  const [googleResultFrom, setGoogleResultFrom] = React.useState<any[]>([])
  const [googleResultTo, setGoogleResultTo] = React.useState<any[]>([])
  const [optResultTo, setOptResultTo] = React.useState<any[]>([])
  const [optResultFrom, setOptResultFrom] = React.useState<any[]>([])

  const onLoad = React.useCallback(async function callback(map) {
    const bounds = new window.google.maps.LatLngBounds();
    map.fitBounds(bounds);
    //@ts-ignore
    DirectionsService.current = new window.google.maps.DirectionsService()
    //@ts-ignore
    ElavationService.current = new window.google.maps.ElevationService()
    setMap(map)
  }, [])


  useEffect(() => {

    async function getDirections() {

      const directionsResult1 = await directionsRequest({
        //@ts-ignore
        DirectionsService: DirectionsService.current,
        origin: {
          lat: searchResultFrom.geometry.location.lat(),
          lon: searchResultFrom.geometry.location.lng()
        },
        destination: {
          lat: searchResultTo.geometry.location.lat(),
          lon: searchResultTo.geometry.location.lng()
        }
      })

      const directionsResult2 = await directionsRequest({
        //@ts-ignore
        DirectionsService: DirectionsService.current,
        origin: {
          lat: searchResultTo.geometry.location.lat(),
          lon: searchResultTo.geometry.location.lng()
        },
        destination: {
          lat: searchResultFrom.geometry.location.lat(),
          lon: searchResultFrom.geometry.location.lng()
        }
      })

      //@ts-ignore
      const r = await computeTotalElavation(ElavationService.current, directionsResult1?.routes[0])
      console.log({ r })
      console.log({ directionsResult1 })

      setDirections(directionsResult1)

      //@ts-ignore
      const bestRouteTo = await findBestRoute(ElavationService.current, directionsResult1?.routes)
      //@ts-ignore
      const bestRouteFrom = await findBestRoute(ElavationService.current, directionsResult2?.routes)

      setOptResult(directionsResult2)

      console.log({ bestRouteTo, bestRouteFrom })

      setOptResultTo([bestRouteTo])
      setOptResultFrom([bestRouteFrom])

      //@ts-ignore
      setGoogleResultTo(directionsResult1?.routes)
      //@ts-ignore
      setGoogleResultFrom(directionsResult2?.routes)

      console.log({ optResultTo, optResultFrom })

      console.log({ directionsResult1 })
    }
    if (searchResultFrom && searchResultTo) {
      console.log({ searchResultFrom, searchResultTo })
      console.log(searchResultFrom.geometry.location)
      getDirections()

    }
  }, [searchResultFrom, searchResultTo])

  const divStyle = {
    background: `white`,
    padding: 4
  }

  const onLoadLabel = (infoWindow: any) => {
    console.log('infoWindow: ', infoWindow)
  }

  const onLoadSearchFrom = (searchP: any) => {
    searchElFrom.current = searchP
  }

  const onLoadSearchTo = (searchP: any) => {
    searchElTo.current = searchP
  }

  const onUnmount = React.useCallback(function callback(map) {
    setMap(null)
  }, [])

  console.log({ optResultTo, googleResultTo, optResultFrom, googleResultFrom })

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={10}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{ streetViewControl: false, mapTypeControl: false }}
    >
      <Autocomplete
        onLoad={onLoadSearchFrom}
        onPlaceChanged={() => {
          //@ts-ignore
          console.log(searchElFrom.current.getPlace())
          //@ts-ignore
          setSearchResultFrom(searchElFrom.current.getPlace())
        }}
      >
        <input
          type="text"
          placeholder="Customized your placeholder"
          style={{
            boxSizing: `border-box`,
            border: `1px solid transparent`,
            width: `240px`,
            height: `32px`,
            padding: `0 12px`,
            borderRadius: `3px`,
            boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
            fontSize: `14px`,
            outline: `none`,
            textOverflow: `ellipses`,
            position: "absolute",
            left: "50%",
            marginLeft: "-120px"
          }}
        />
      </Autocomplete>
      {searchResultFrom && <Autocomplete
        onLoad={onLoadSearchTo}
        onPlaceChanged={() => {
          //@ts-ignore
          console.log(searchElTo.current.getPlace())
          //@ts-ignore
          setSearchResultTo(searchElTo.current.getPlace())
        }}
      >
        <input
          type="text"
          placeholder="Customized your placeholder"
          style={{
            boxSizing: `border-box`,
            border: `1px solid transparent`,
            width: `240px`,
            height: `32px`,
            padding: `0 12px`,
            borderRadius: `3px`,
            boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
            fontSize: `14px`,
            outline: `none`,
            textOverflow: `ellipses`,
            position: "absolute",
            left: "50%",
            top: '54px',
            marginLeft: "-120px"
          }}
        />
      </Autocomplete>}
      {googleResultFrom && googleResultFrom.map((r: any, k: number) =>
        <>
          <DirectionsRenderer
            key={`googlef-route-${k}`}
            routeIndex={k}
            directions={directions}
            options={DIRECTIONS_OPTIONS}
          />
        </>)
      }
      {/* {optResultTo && optResultTo.map((r: any, k: number) =>
        <>
          <DirectionsRenderer
            key={`optResultTo-route-${k}`}
            routeIndex={k}
            directions={directions}
            options={DIRECTIONS_OPTIONS_OJ}
          />

        </>)
      } */}
      {googleResultTo && googleResultTo.map((r: any, k: number) =>
        <DirectionsRenderer
          key={`googleResultTo-route-${k}`}
          routeIndex={k}
          directions={directions}
          options={DIRECTIONS_OPTIONS}
        />
      )
      }
      {/* {optResultFrom && optResultFrom.map((r: any, k: number) =>
        <>
          <DirectionsRenderer
            key={`optResultFrom-route-${k}`}
            routeIndex={k}
            directions={directions}
            options={DIRECTIONS_OPTIONS_OJ}
          />

        </>)
      } */}




      { /* Child components, such as markers, info windows, etc. */}
      <></>
    </GoogleMap>
  ) : <></>
}

export default React.memo(App)