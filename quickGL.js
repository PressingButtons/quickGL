{
    class QuickGL {

        #shaders = { };
        #textres = { };
    
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
    
        shader(key) {
            return this.#shaders[key];
        }
    
        useProgram(name) {
            if(!this.#shaders[name]) throw `quickGL - program error - program not defined[${name}].`;
            this.gl.useProgram(this.#shaders[name].program);
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        }
    
        setAttribute(attribute, length, stride, offset) {
            this.#gl.enableVertexAttribArray(attribute);
            this.#gl.vertexAttribPointer(attribute, length, this.#gl.FLOAT, false, stride * 4, offset * 4);
        }
    
        setAttributes(attributes) {
            for(const key in attributes) {
                const attr = attributes[key];
                this.setAttribute(attr.attr, attr.length, attr.stride, attr.offset);
            }
        }
    
        setMatrix(uniform, data) {
            this.#gl.uniformMatrix4fv(uniform, false, data);
        }
    
        setMatrices(uniforms) {
            for(const key in uniforms) {
                const unif = uniforms[key];
                this.setMatrix(uniform.uniform, uniform.data);
            }
        }
    
        setTexture(uniform, texture, index) {
            this.#gl.activeTexture(gl.TEXTURE0 + index);
            this.#gl.bindTexture(gl.TEXTURE_2D, texture);
            this.#gl.uniform1i(uniform, index);
        }
    
        setTextures(textures) {
            let i = 0;
            for(const key in textures) {
                this.setTexture(textures[key].uniform, textures[key].texture, i);
                i++;
            }
        }
    
        draw(shader_name, attributes, matrices, textures) {
            this.useProgram(shader_name);
            this.setAttributes(attributes);
            this.setMatrices(matrices)
            this.setTexture(textures);
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
    
    self.QuickGL = QuickGL;

}