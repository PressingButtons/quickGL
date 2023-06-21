 export default class QuickGL {

    #shaders  = { };
    #programDetails;
    /** @type {WebGLRenderingContext} */
    #gl;

    constructor(canvas, options = { }, gl_context = 'webgl') {
        this.#gl = canvas.getContext(gl_context, options);
    }

    get gl( ) { return this.#gl }


    compile(name, vertex, fragment) {
        const program = compile(this.gl, vertex, fragment);
        if(program) this.#shaders[name] = program;
        else throw 'quickGL - compiile error!';
    }

    createBuffer( buffer_data ) {
        return CreateBuffer(this.gl, buffer_data);
    }

    createTexture(bitmap) {
        return CreateTexture(this.gl, bitmap);
    }

    shader(key) {
        return this.#shaders[key];
    }

    useProgram(name) {
        if(!this.#shaders[name]) throw `quickGL - program error - program not defined[${name}].`;
        this.gl.useProgram(this.#shaders[name].program);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.#programDetails = this.#shaders[name];
    }

    setAttribute(attribute, length, stride, offset = 0) {
        const location = this.#programDetails.attributes[attribute];
        this.#gl.enableVertexAttribArray(location);
        this.#gl.vertexAttribPointer(location, length, this.#gl.FLOAT, false, stride * 4, offset * 4);
    }

    setAttributes(attributes) {
        for(const group of attributes) {
            this.setAttribute(group.location, group.length, group.stride, group.offset);
        }
    }

    setBuffer( buffer ) {
        this.#gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    }

    setMatrix(uniform, data) {
        const location = this.#programDetails.uniforms[uniform];
        this.#gl.uniformMatrix4fv(location, false, data);
    }

    setMatrices(uniforms) {
      for(const uniform of uniforms) this.setMatrix(uniform.location, uniform.value);
    }

    setTexture(uniform, texture, index) {
        this.#gl.activeTexture(this.#gl.TEXTURE0 + index);
        this.#gl.bindTexture(this.#gl.TEXTURE_2D, texture);
        this.setUniform('uniform1i', uniform, index);
    }

    setTextures(textures) {
        for(let i = 0; i < textures.length; i++) this.setTexture(textures[i].location, textures[i].texture, i);
    }

    setUniform(method, uniform, value) {
        const location = this.#programDetails.uniforms[uniform];
        this.#gl[method](location, value);
    }

    setUniforms(uniforms) {
        for(const group of uniforms) this.setUniform(group.method, group.location, group.value);
    }

    draw(first, vertices) {
        this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, first, vertices);
    }

    fill( color ) {
        this.gl.clearColor(...color);
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT);
    }

}


// COMPILING SHADERS =========================================================
/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {String} vertex_source 
 * @param {String} fragment_source 
 */
function compile(gl, vertex_source, fragment_source) {
    try {
        const shaders = createShaders(gl, vertex_source, fragment_source);
        const program = createProgram(gl, shaders);
        return {
            program: program, 
            uniforms: getUniforms(gl, program, vertex_source, fragment_source), 
            attributes: getAttributes(gl, program, vertex_source, fragment_source)
        }
    } catch (err) {
        console.error('quickGL failed to compile, review log for detail.', err);
    }
}

function createShaders(gl, vertex_source, fragment_source) {
    return {
        vertex:   createShader(gl, vertex_source, gl.VERTEX_SHADER),
        fragment: createShader(gl, fragment_source, gl.FRAGMENT_SHADER)
    }
}

function createShader(gl, text, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    reportError(gl.getShaderInfoLog(shader), text);
    gl.deleteShader(shader);
    throw 'quickGL shader error.'
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {Object} shaders 
 */
function createProgram(gl, shaders) {
    const program = gl.createProgram( );
    gl.attachShader(program, shaders.vertex);
    gl.attachShader(program, shaders.fragment);
    gl.linkProgram(program, gl.LINK_STATUS);
    if(gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
    reportError(gl.getProgramInfoLog(program), '***');
    gl.deleteProgram(program);
    throw 'quickGL program error.';
}

function getParameter(vertex, fragment, key) {
    const params = { };
    let keys = [extractVariable(vertex, key), extractVariable(fragment, key)].flat( );    
    return [...new Set(keys)];
}

function getAttributes( gl, program, vertex, fragment) {
    const attributes = { };
    const keys = getParameter(vertex, fragment, 'attribute');
    keys.forEach(key => {attributes[key] = gl.getAttribLocation(program, key)});
    return attributes; 
}

function getUniforms( gl, program, vertex, fragment) {
    const uniforms = { };
    const keys = getParameter(vertex, fragment, 'uniform');
    for(const key of keys) uniforms[key] = gl.getUniformLocation(program, key);
    return uniforms ;
}


//utility methods ===============================================
function reportError(info, source) {
    console.error(
        'quickGL - [compile err] -------------------------------------------------->\n',
        info + '\n', source + '\n',
        '-------------------------------------------------------------------------->\n',
    );
}

function extractVariable(text, key) {
    const regex = new RegExp(`(?<=${key} ).*`, 'g');
    const results = text.match(regex);
    return results ? results.map( x => x.substring(x.lastIndexOf(' ') + 1, x.length - 1)) : [];
}

// WEBGL UTILITIE METHODS  ==============================================================
function CreateBuffer(gl, buffer_data) {
    const buffer = gl.createBuffer( );
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, buffer_data, gl.STATIC_DRAW);
    return buffer;
}

function CreateTexture(gl, bitmap) {
    const texture = gl.createTexture( );
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    if(powerOf2(bitmap.width) && powerOf2(bitmap.height)) gl.generateMipmap(gl.TEXTURE_2D);
    else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    return texture;
}

function powerOf2(n) {
    return (n & (n - 1) == 0);
}

