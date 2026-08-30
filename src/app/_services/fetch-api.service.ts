import { Injectable, Inject } from '@angular/core';

/**
 * FetchApiService is our http service
 */

 @Injectable({
  providedIn: 'root'
})
export class FetchApiService {

  constructor() {
  }

/***********************************  private methods **************************************/

/**
 * requestData() delivers data object of a responsee
 * @param request http request
 * @returns promise for an element (which is delieverd as response sub object 'data'  of fetch)
 *  of requested type
 */
  private async requestData<T>(request: Request): Promise<T> {
    const response = await fetch(request);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const d = await (response.json() as Promise<{ data: T; }>);
    return d.data;
  }

  /**
   * request() delivers responsee
   * @param request http request
   * @returns promise for an element (which is delieverd as response  of fetch)
   *  of requested type
   */
  private async request<T>(request: Request): Promise<T> {
    const response = await fetch(request);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json() as Promise<T>;

  }

  /**
   * requestTxt() delivers responsee converted to text sting
   * @param request http request
   * @returns promise for an element (which is delieverd as response  of fetch)
   *  of requested type
   */
   private async requestTxt(request: Request): Promise<string> {
    // console.log('request of requestTxt:', request);
    const response = await fetch(request);
    if (!response.ok) {
      // console.log('response of requestTxt not ok:', response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // console.log('response of requestTxt: ', response);
    return response.text() as Promise<string>;

  }


  /**
   * requestEtag() delivers response together with Etag
   * @param request http request
   * @returns promise for an element (which is delieverd as response of fetch)
   *  of requested type
   */
  private async requestEtag<T>(request: Request): Promise<{element: T, etag: string | null}>  {

    const response = await fetch(request);
    // console.log('response of request:', response);
    /* debugging of header is possible with forEach() ....
    response.headers.forEach((value, key) => {
      console.log(`${key} ==> ${value}`);
    });
     */
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const element: T = await response.json();
    const etag: string | null = response.headers.get('etag');
    return {element, etag};

  }


  /**
   * requestBuffer() delivers responsee as arrayBuffer
   * @param request http request
   * @returns promise for an element (which is delieverd as response  of fetch)
   *  of requested type
   */
  private async requestBuffer(request: Request): Promise<ArrayBuffer> {
    // console.log('request of requestTxt:', request);
    const response = await fetch(request);
    if (!response.ok) {
      // console.log('response of requestTxt not ok:', response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // console.log('response of requestTxt: ', response);
    return response.arrayBuffer();

  }

  /**
   * requestBlob() delivers responsee as blog
   * @param request http request
   * @returns promise for an element (which is delieverd as response  of fetch)
   *  of requested type
   */
  private async requestBlob(request: Request): Promise<Blob> {
    // console.log('request of requestTxt:', request);
    const response = await fetch(request);
    if (!response.ok) {
      // console.log('response of requestTxt not ok:', response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // console.log('response of requestTxt: ', response);
    return response.blob();

  }


  /**
   * requestOk() proceed request, deliver responsee.ok
   * @param request http request
   * @returns promise for response.ok
   */
  private async requestOk(request: Request): Promise<boolean> {
    /* debugging of header is possible with forEach() ....
      request.headers.forEach((value, key) => {
        console.log(`${key} ==> ${value}`);
      });
    */
    const response = await fetch(request);
    // console.log('response: ', response);
    if (!response.ok) {
      // console.log('response of requestTxt not ok:', response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.ok;

  }



/** ------------------------  public methods --------------------------------------------------- */

public getOk(resource: string, headers: Headers, mode: RequestMode): Promise<boolean>{
  const init = {
    method: 'GET',
    headers,
    mode
  };
  let request = new Request(resource, init);
  return this.requestOk(request);
}


public get<T>(resource: string, headers: Headers, mode: RequestMode): Promise<T> {
    const init = {
      method: 'GET',
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.request<T>(request);
  }


  public getEtag<T>(resource: string, headers: Headers, mode: RequestMode): Promise<{element: T, etag: string | null}> {
    const init = {
      method: 'GET',
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.requestEtag<T>(request);
  }


  public async getTxt(resource: string, headers: Headers, mode: RequestMode): Promise<string> {
    const init = {
      method: 'GET',
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.requestTxt(request);
  }

  public async getBuffer(resource: string, headers: Headers, mode: RequestMode): Promise<ArrayBuffer> {
    const init = {
      method: 'GET',
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.requestBuffer(request);
  }

  public async getBlob(resource: string, headers: Headers, mode: RequestMode): Promise<Blob> {
    const init = {
      method: 'GET',
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.requestBlob(request);
  }

  public getData<T>(resource: string, headers: Headers, mode: RequestMode): Promise<T> {
    const init = {
      method: 'GET',
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.requestData<T>(request);
  }

  public async put(resource: string, body: object, headers: Headers, mode: RequestMode): Promise<boolean> {
    const init = {
      method: 'PUT',
      body: JSON.stringify(body),
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.requestOk(request);
  }

  public async putTxt(resource: string, fileString: string,  headers: Headers, mode: RequestMode): Promise<boolean> {
    const init = {
      method: 'PUT',
      body: fileString,
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.requestOk(request);
  }

  public postResponse<T>(resource: string, body: object, headers: Headers, mode: RequestMode): Promise<T>  {
    const init = {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.request<T>(request);
  }

    public post(resource: string, body: object, headers: Headers, mode: RequestMode): Promise<boolean> {
    const init = {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.requestOk(request);
  }

  public delete(resource: string, headers: Headers, mode: RequestMode): Promise<boolean> {
    const init = {
      method: 'DELETE',
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.requestOk(request);
  }

  public mkcol(resource: string, headers: Headers, mode: RequestMode): Promise<boolean> {
    const init = {
      method: 'MKCOL',
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.requestOk(request);
  }

  public propfind(resource: string, headers: Headers, mode: RequestMode): Promise<string> {
    const init = {
      method: 'PROPFIND',
      headers,
      mode
    };
    let request = new Request(resource, init);
    return this.requestTxt(request);
  }


  public async getReadRequest(file: File, readAs?: string): Promise<string> {

    const reader = new FileReader();

    const filePromise: Promise<string> = new Promise((resolve, reject) => {
      reader.onerror = () => {
        reader.abort();
        reject(reader.error);
      };
      reader.onload = () => {
        resolve(reader.result as string);
      };
      switch (readAs?.toLowerCase()) {
        case 'txt':
          reader.readAsText(file);
          break;
        case 'dataurl':
          reader.readAsDataURL(file);
          break;
        default:
          reader.readAsText(file);
          break;
      }

    });

    return filePromise;
  }


}
