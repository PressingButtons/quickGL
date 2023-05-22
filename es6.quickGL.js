 export default class QuickGL {
    #programs = { };
    #gl;

    constructor(canvas, options = { }, gl_context = 'webgl') {
        this.#gl = canvas.getContext(gl_context, options);
    }

    get gl( ) { return this.#gl }


    compile(name, vertex, fragment) {
        const program = compile(this.gl, vertex, fragment);
        if(program) this.#programs[name] = program;
        else throw 'quickGL - compiile error!';
    }

    program(key) {
        return this.#programs[key];
    }

}

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
            uniforms: getParameter(program, vertex_source, fragment_source, 'uniform'), 
            attributes: getParameter(program, vertex_source, fragment_source, 'attribute')
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
    if(gl.getShaderParameter(program, gl.COMPILE_STATUS)) return shader;
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

function getParameter(gl, vertex, fragment, key) {
    const keys = [extractVariable(vertex, key), extractVariable(fragment, key)];
    return [...new Set(keys)];
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



